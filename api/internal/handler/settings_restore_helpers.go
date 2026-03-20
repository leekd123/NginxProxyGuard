package handler

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"

	"nginx-proxy-guard/internal/model"
)

func (h *SettingsHandler) extractFile(tarReader *tar.Reader, destPath string, header *tar.Header) error {
	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(destPath), 0755); err != nil {
		return err
	}

	// Remove existing symlink or file if it exists
	if info, err := os.Lstat(destPath); err == nil {
		if info.Mode()&os.ModeSymlink != 0 {
			// It's a symlink, remove it
			os.Remove(destPath)
		} else if info.IsDir() {
			// It's a directory, skip (don't overwrite directories)
			return nil
		}
	}

	// Create destination file
	outFile, err := os.OpenFile(destPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, os.FileMode(header.Mode))
	if err != nil {
		return err
	}
	defer outFile.Close()

	// Use LimitReader to read exactly the expected amount
	limitReader := io.LimitReader(tarReader, header.Size)
	written, err := io.Copy(outFile, limitReader)
	if err != nil {
		return fmt.Errorf("copy error after %d bytes (expected %d): %w", written, header.Size, err)
	}

	if written != header.Size {
		return fmt.Errorf("size mismatch: wrote %d bytes, expected %d", written, header.Size)
	}

	return nil
}

// extractExportJSON reads only the export.json from a backup file
func (h *SettingsHandler) extractExportJSON(backupPath string) ([]byte, error) {
	file, err := os.Open(backupPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open backup file: %w", err)
	}
	defer file.Close()

	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return nil, fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to read tar entry: %w", err)
		}

		if header.Name == "data/export.json" {
			return io.ReadAll(tarReader)
		}
	}

	return nil, nil // No export.json found
}

// restoreFilesFromBackup restores config and certificate files from backup
func (h *SettingsHandler) restoreFilesFromBackup(backup *model.Backup) error {
	file, err := os.Open(backup.FilePath)
	if err != nil {
		return fmt.Errorf("failed to open backup file: %w", err)
	}
	defer file.Close()

	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %w", err)
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)
	var restoreErrors []string

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("failed to read tar entry: %w", err)
		}

		// Skip directories and symlinks
		if header.Typeflag == tar.TypeDir || header.Typeflag == tar.TypeSymlink || header.Typeflag == tar.TypeLink {
			continue
		}

		// Skip entries with zero size (likely directories without proper type flag)
		if header.Size == 0 {
			continue
		}

		// Skip export.json (already processed in phase 1)
		if header.Name == "data/export.json" {
			continue
		}

		switch {
		case filepath.Dir(header.Name) == "config/conf.d":
			// Restore config files
			if backup.IncludesConfig && !strings.HasSuffix(header.Name, "/") {
				destPath := filepath.Join("/etc/nginx/conf.d", filepath.Base(header.Name))
				if err := h.extractFile(tarReader, destPath, header); err != nil {
					restoreErrors = append(restoreErrors, fmt.Sprintf("config %s: %v", header.Name, err))
				}
			}

		case filepath.HasPrefix(header.Name, "certs/"):
			// Restore certificates
			if backup.IncludesCertificates && !strings.HasSuffix(header.Name, "/") && strings.Contains(filepath.Base(header.Name), ".") {
				relPath := header.Name[6:] // Remove "certs/" prefix
				destPath := filepath.Join("/etc/nginx/certs", relPath)
				if err := h.extractFile(tarReader, destPath, header); err != nil {
					restoreErrors = append(restoreErrors, fmt.Sprintf("cert %s: %v", header.Name, err))
				}
			}
		}
	}

	if len(restoreErrors) > 0 {
		return fmt.Errorf("file restore errors: %v", restoreErrors)
	}

	return nil
}

// restoreFilesFromBackupDetailed restores files and returns detailed results
func (h *SettingsHandler) restoreFilesFromBackupDetailed(backup *model.Backup) (int, []string) {
	file, err := os.Open(backup.FilePath)
	if err != nil {
		return 0, []string{fmt.Sprintf("failed to open backup file: %v", err)}
	}
	defer file.Close()

	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return 0, []string{fmt.Sprintf("failed to create gzip reader: %v", err)}
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)
	var restoreErrors []string
	var filesRestored int

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			restoreErrors = append(restoreErrors, fmt.Sprintf("tar read error: %v", err))
			break
		}

		// Skip directories, symlinks, zero-size entries, export.json
		if header.Typeflag == tar.TypeDir || header.Typeflag == tar.TypeSymlink ||
			header.Typeflag == tar.TypeLink || header.Size == 0 ||
			header.Name == "data/export.json" {
			continue
		}

		switch {
		case filepath.Dir(header.Name) == "config/conf.d":
			if backup.IncludesConfig && !strings.HasSuffix(header.Name, "/") {
				destPath := filepath.Join("/etc/nginx/conf.d", filepath.Base(header.Name))
				if err := h.extractFile(tarReader, destPath, header); err != nil {
					restoreErrors = append(restoreErrors, fmt.Sprintf("config %s: %v", header.Name, err))
				} else {
					filesRestored++
				}
			}

		case filepath.HasPrefix(header.Name, "certs/"):
			if backup.IncludesCertificates && !strings.HasSuffix(header.Name, "/") &&
				strings.Contains(filepath.Base(header.Name), ".") {
				relPath := header.Name[6:]
				destPath := filepath.Join("/etc/nginx/certs", relPath)
				if err := h.extractFile(tarReader, destPath, header); err != nil {
					restoreErrors = append(restoreErrors, fmt.Sprintf("cert %s: %v", header.Name, err))
				} else {
					filesRestored++
				}
			}
		}
	}

	return filesRestored, restoreErrors
}

// verifyBackupChecksum verifies the SHA256 checksum of a backup file
func (h *SettingsHandler) verifyBackupChecksum(filePath, expectedChecksum string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file for checksum verification: %w", err)
	}
	defer file.Close()

	hasher := sha256.New()
	if _, err := io.Copy(hasher, file); err != nil {
		return fmt.Errorf("failed to calculate checksum: %w", err)
	}

	actualChecksum := hex.EncodeToString(hasher.Sum(nil))
	if actualChecksum != expectedChecksum {
		return fmt.Errorf("checksum mismatch: expected %s, got %s", expectedChecksum, actualChecksum)
	}

	return nil
}

// getMergedWAFExclusions returns merged WAF exclusions (host-specific + global)
// This is used during backup restore to regenerate WAF configs correctly
func (h *SettingsHandler) getMergedWAFExclusions(ctx context.Context, hostID string) []model.WAFRuleExclusion {
	if h.wafRepo == nil {
		return nil
	}

	// Get host-specific exclusions
	hostExclusions, err := h.wafRepo.GetExclusionsByProxyHost(ctx, hostID)
	if err != nil {
		log.Printf("[Backup] Warning: failed to get host WAF exclusions for %s: %v", hostID, err)
		hostExclusions = nil
	}

	// Get global exclusions
	globalExclusions, err := h.wafRepo.GetGlobalExclusions(ctx)
	if err != nil {
		log.Printf("[Backup] Warning: failed to get global WAF exclusions: %v", err)
		return hostExclusions // Return host-only if global fails
	}

	// Create a map of host exclusions to avoid duplicates
	hostExclusionMap := make(map[int]bool)
	for _, ex := range hostExclusions {
		hostExclusionMap[ex.RuleID] = true
	}

	// Merge: start with host exclusions
	merged := make([]model.WAFRuleExclusion, len(hostExclusions))
	copy(merged, hostExclusions)

	// Add global exclusions that are not already in host exclusions
	for _, gex := range globalExclusions {
		if !hostExclusionMap[gex.RuleID] {
			merged = append(merged, model.WAFRuleExclusion{
				ID:              gex.ID,
				ProxyHostID:     "global",
				RuleID:          gex.RuleID,
				RuleCategory:    gex.RuleCategory,
				RuleDescription: gex.RuleDescription,
				Reason:          gex.Reason + " (global)",
				DisabledBy:      gex.DisabledBy,
				CreatedAt:       gex.CreatedAt,
			})
		}
	}

	return merged
}
