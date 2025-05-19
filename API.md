# Roundtable Alias API Documentation

This document provides detailed information about the Roundtable Alias API endpoints, request/response formats, and usage examples.

## Table of Contents

- [API Overview](#api-overview)
- [Main API Endpoint](#main-api-endpoint)
  - [Request Format](#request-format)
  - [Response Format](#response-format)
  - [Example Request](#example-request)
  - [Example Response](#example-response)
- [Identify Duplicates Endpoint](#identify-duplicates-endpoint)
  - [Request Format](#identify-duplicates-request-format)
  - [Response Format](#identify-duplicates-response-format)
  - [Example Request](#identify-duplicates-example-request)
  - [Example Response](#identify-duplicates-example-response)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Authentication](#authentication)

## API Overview

The Roundtable Alias API provides three quality checks for open-ended survey responses:

1. **Categorizations**: Labels responses as `Valid`, `Profane`, `Off-topic`, `Gibberish`, or `GPT`
2. **Effort Scores**: Rates responses on a scale of 1-10 (0 for empty responses)
3. **Duplicate Detection**: Identifies and groups similar responses using string distance algorithms

The API consists of two endpoints:
- Main endpoint (`/`): Processes survey responses and performs all quality checks
- Identify duplicates endpoint (`/identify-duplicates`): Helper endpoint for duplicate detection

## Main API Endpoint

**URL**: `/`  
**Method**: `POST`  
**Content-Type**: `application/json` or `application/x-www-form-urlencoded`

### Request Format

The main API endpoint accepts the following parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `questions` | Object | Yes | An object where keys are question IDs and values are the question texts |
| `survey_id` | String | Yes | A unique identifier for the survey |
| `participant_id` | String | Yes | A unique identifier for the participant |
| `responses` | Object | Yes | An object where keys are question IDs (matching those in `questions`) and values are the participant's responses |
| `low_effort_threshold` | Number | No | Optional threshold for flagging low-effort responses (default: 0) |

### Response Format

The API returns a JSON object with the following structure:

| Field | Type | Description |
|-------|------|-------------|
| `error` | Boolean | Indicates whether an error occurred during processing |
| `checks` | Object | An object where keys are question IDs and values are arrays of flags (e.g., "Profane", "Off-topic", "Gibberish", "GPT", "Low-effort", "Cross-duplicate response", "Self-duplicate response") |
| `response_groups` | Object | An object where keys are question IDs and values are group IDs for duplicate detection |
| `effort_ratings` | Object | An object where keys are question IDs and values are effort scores (1-10, or 0 for empty responses) |

### Example Request

```json
{
  "questions": {
    "q1": "What is your favorite color?",
    "q2": "Describe your ideal vacation."
  },
  "survey_id": "survey123",
  "participant_id": "participant456",
  "responses": {
    "q1": "Blue",
    "q2": "A relaxing beach vacation with plenty of sunshine."
  },
  "low_effort_threshold": 3
}
```

### Example Response

```json
{
  "error": false,
  "checks": {
    "q1": ["Low-effort"],
    "q2": []
  },
  "response_groups": {
    "q1": 1,
    "q2": 2
  },
  "effort_ratings": {
    "q1": 2,
    "q2": 6
  }
}
```

## Identify Duplicates Endpoint

**URL**: `/identify-duplicates`  
**Method**: `POST`  
**Content-Type**: `application/json`

This endpoint is primarily used internally by the main API but can also be called directly for custom duplicate detection.

### Identify Duplicates Request Format

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `s1` | String | Yes | The target string to compare against other responses |
| `responses` | Array | Yes | An array of objects, each containing a `finalState` property with the text to compare against `s1` |

### Identify Duplicates Response Format

| Field | Type | Description |
|-------|------|-------------|
| `error` | Boolean | Indicates whether an error occurred during processing |
| `responsesWithMetrics` | Array | An array of objects containing the original response data plus similarity metrics |

Each object in the `responsesWithMetrics` array includes:

| Field | Type | Description |
|-------|------|-------------|
| `s1` | String | The original target string |
| `s2` | String | The comparison string (from the `finalState` property) |
| `nlev` | Number | Normalized Levenshtein distance (0-1, lower means more similar) |
| `rlev` | Number | Raw Levenshtein distance (absolute character edits) |
| `nlcs` | Number | Normalized longest common substring ratio (0-1, higher means more similar) |
| `rlcs` | Number | Raw longest common substring length (characters) |

### Identify Duplicates Example Request

```json
{
  "s1": "a relaxing beach vacation with plenty of sunshine",
  "responses": [
    {
      "id": "resp1",
      "finalState": "a relaxing beach vacation with lots of sunshine",
      "questionId": "q2",
      "participantId": "participant789"
    },
    {
      "id": "resp2",
      "finalState": "skiing in the mountains with snow and hot chocolate",
      "questionId": "q2",
      "participantId": "participant101"
    }
  ]
}
```

### Identify Duplicates Example Response

```json
{
  "error": false,
  "responsesWithMetrics": [
    {
      "id": "resp1",
      "finalState": "a relaxing beach vacation with lots of sunshine",
      "questionId": "q2",
      "participantId": "participant789",
      "s1": "a relaxing beach vacation with plenty of sunshine",
      "s2": "a relaxing beach vacation with lots of sunshine",
      "nlev": 0.0851,
      "rlev": 4,
      "nlcs": 0.8936,
      "rlcs": 42
    },
    {
      "id": "resp2",
      "finalState": "skiing in the mountains with snow and hot chocolate",
      "questionId": "q2",
      "participantId": "participant101",
      "s1": "a relaxing beach vacation with plenty of sunshine",
      "s2": "skiing in the mountains with snow and hot chocolate",
      "nlev": 0.8936,
      "rlev": 42,
      "nlcs": 0.1064,
      "rlcs": 5
    }
  ]
}
```

## Error Handling

The API returns a JSON object with the following structure when an error occurs:

```json
{
  "error": true,
  "problem": "Error message describing the issue"
}
```

Common error scenarios include:

| HTTP Status | Error Message | Description |
|-------------|---------------|-------------|
| 400 | "Must pass a serialized JSON object or a query string" | Invalid request format |
| 400 | "Missing questions, survey_id, participant_id, responses" | Required parameters are missing |
