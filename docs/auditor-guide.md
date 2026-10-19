# Auditor Guide - Data Provenance and Exports

This document explains how auditors can retrieve verifiable ecological and transaction history bundles from the Verdant Bond Protocol API and verify their cryptographic integrity.

---

## Provenance Export Endpoints

The API provides two authenticated export endpoints optimized for audit compliance and deterministic provenance tracking.

### 1. Project Audit Export
*   **Endpoint**: `GET /projects/:id/export`
*   **Authentication**: Requires JWT Bearer Token (`JwtAuthGuard`).
*   **Response Format**: Deterministic JSON including:
    *   `generationMetadata`: Timestamps, exporter address, and payload checksum.
    *   `project`: Core registry values (methodology, developer, location).
    *   `documents`: Files linked to the project (IPFS CID hashes, file names).
    *   `reports`: Every oracle telemetry report submitted (sequestration mass, signatures, status).
    *   `relatedBonds`: Deployed bond IDs backing this specific project.

### 2. Bond Audit Export
*   **Endpoint**: `GET /bonds/:id/export`
*   **Authentication**: Requires JWT Bearer Token (`JwtAuthGuard`).
*   **Response Format**: Deterministic JSON including:
    *   `generationMetadata`: Timestamps, exporter address, and payload checksum.
    *   `bond`: Bond parameters (face value, credit types, schedules).
    *   `lifecycleEvents`: State transitions (Issued, Matured, Defaults).
    *   `holders`: Wallet addresses and current balances.
    *   `couponDistributions`: Period intervals, report IDs, and distributed credits.
    *   `retirements`: Credit retirement records (burn certificates, amounts).

---

## Verifying Integrity Checksums

Every data export payload contains a SHA-256 checksum calculated over the JSON fields sorted alphabetically. This proves that the data was not tampered with post-generation.

### Checksum Verification Script (Node.js)

Auditors can run the following script to verify the integrity of any downloaded export bundle:

```javascript
const fs = require('fs');
const crypto = require('crypto');

// Load export bundle
const bundle = JSON.parse(fs.readFileSync('project-export-1.json', 'utf8'));

// Extract generation metadata and checksum
const { checksum } = bundle.generationMetadata;

// Omit checksum field from calculation
const payloadCopy = JSON.parse(JSON.stringify(bundle));
delete payloadCopy.generationMetadata.checksum;

// Sort JSON keys alphabetically for deterministic output
const sortedData = JSON.stringify(payloadCopy, Object.keys(payloadCopy).sort());

// Compute SHA-256 hash
const calculatedChecksum = crypto.createHash('sha256').update(sortedData).digest('hex');

if (calculatedChecksum === checksum) {
  console.log('✓ Checksum matches! The data is verified and has not been tampered with.');
  console.log(`Hash: ${calculatedChecksum}`);
} else {
  console.error('✗ Checksum MISMATCH! The export bundle may have been altered.');
  console.error(`Expected: ${checksum}`);
  console.error(`Calculated: ${calculatedChecksum}`);
}
```
