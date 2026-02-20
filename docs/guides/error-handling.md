# Error Handling

The SDK provides two custom error classes and comprehensive error code mappings for each provider.

## Error Classes

### ApiError

Thrown when an API request fails (authentication, validation, rate limits, network errors).

```typescript
import { ApiError } from 'magi-3d/server';

try {
  const taskId = await client.createTask(params);
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Error code:', error.code);       // SDK error code (e.g., 'RATE_LIMIT_EXCEEDED')
    console.log('HTTP status:', error.httpStatus); // e.g., 429
    console.log('Raw response:', error.raw);       // Provider's raw response
  }
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `code` | string | SDK-normalized error code |
| `message` | string | Human-readable error message |
| `httpStatus` | number \| undefined | HTTP status code |
| `raw` | unknown | Provider's raw error response |

### TaskError

Thrown when a task fails during polling (generation failure, content policy violation, task expiration).

```typescript
import { TaskError } from 'magi-3d/server';

try {
  const result = await client.pollUntilDone(taskId);
} catch (error) {
  if (error instanceof TaskError) {
    console.log('Error code:', error.code);             // SDK error code
    console.log('Task:', error.task);                   // Full StandardTask object
    console.log('Task error:', error.task.error?.raw);  // Provider's raw error
  }
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `code` | string | SDK-normalized error code |
| `message` | string | Human-readable error message |
| `task` | StandardTask | Full task object with error details |

## Usage Patterns

### Server-Side Error Handling

```typescript
import { TaskError, ApiError } from 'magi-3d/server';

try {
  const taskId = await client.createTask(params);
  const result = await client.pollUntilDone(taskId);
  console.log('Model URL:', result.result?.model);
} catch (error) {
  if (error instanceof TaskError) {
    // Task failed during generation
    console.log('Task failed:', error.code);
    console.log('Raw error:', error.task.error?.raw);
  } else if (error instanceof ApiError) {
    // API request failed (auth, validation, etc.)
    console.log('API error:', error.code, error.httpStatus);
    console.log('Raw response:', error.raw);
  }
}
```

### React Error Handling

```tsx
import { useCreateTask, TaskStatus } from 'magi-3d/react';

const { task, error } = useCreateTask({
  api: '/api/3d',
  onError: (err) => console.error('Error:', err)
});

// Handle task-level errors
if (task?.error) {
  switch (task.error.code) {
    case 'CONTENT_POLICY_VIOLATION':
      showAlert('Content was flagged. Please modify and retry.');
      break;
    case 'INSUFFICIENT_CREDITS':
      showAlert('Please purchase more credits.');
      break;
    case 'RATE_LIMIT_EXCEEDED':
      showAlert('Too many requests. Please wait and retry.');
      break;
    default:
      showAlert(task.error.message);
  }
}

// Handle API-level errors
if (error) {
  showAlert(`Request failed: ${error.message}`);
}
```

### Polling Behavior

`pollUntilDone` handles transient errors with automatic retry:

| Setting | Default | Description |
|---------|---------|-------------|
| `interval` | 3000ms | Polling interval |
| `timeout` | 300000ms (5min) | Max wait time before timeout |
| `maxRetries` | 5 | Consecutive errors before giving up |

On transient errors, the client applies exponential backoff (capped at 15s). The retry counter resets after each successful poll.

Terminal states:
- `SUCCEEDED` - Resolves with result
- `FAILED` / `CANCELED` - Rejects with `TaskError`
- Timeout exceeded - Rejects with error
- Max retries exceeded - Rejects with last error

---

## Tripo Error Codes

### API Error Codes

Returned when `createTask()` or `getTask()` fail at the API level.

| Tripo Code | SDK Error Code | HTTP | Description |
|------------|----------------|------|-------------|
| 1000 | `SERVER_ERROR` | 500 | Server error |
| 1001 | `FATAL_SERVER_ERROR` | 500 | Fatal server error |
| 1004 | `INVALID_PARAMETER` | 400 | Invalid parameter |
| 1005 | `ACCESS_DENIED` | 401/403 | Access denied |
| 2000 | `RATE_LIMIT_EXCEEDED` | 429 | Rate limit hit |
| 2001 | `TASK_NOT_FOUND` | 404 | Invalid task ID |
| 2002 | `UNSUPPORTED_TASK_TYPE` | 400 | Invalid task type |
| 2003 | `INPUT_FILE_EMPTY` | 400 | No input file |
| 2004 | `UNSUPPORTED_FILE_TYPE` | 400 | Bad file format |
| 2006 | `INVALID_ORIGINAL_TASK` | 400 | Bad original task reference |
| 2007 | `ORIGINAL_TASK_NOT_SUCCESS` | 400 | Original task not completed |
| 2008 | `CONTENT_POLICY_VIOLATION` | 400 | Content banned |
| 2010 | `INSUFFICIENT_CREDITS` | 403 | No credits remaining |
| 2014 | `AUDIT_SERVICE_ERROR` | 500 | Content moderation error |
| 2015 | `DEPRECATED_VERSION` | 400 | Model version deprecated |
| 2016 | `DEPRECATED_TASK_TYPE` | 400 | Task type deprecated |
| 2017 | `INVALID_MODEL_VERSION` | 400 | Invalid model version |
| 2018 | `MODEL_TOO_COMPLEX` | 400 | Cannot remesh model |
| 2019 | `FILE_NOT_FOUND` | 404 | File reference invalid |

Unmapped codes are returned as `TRIPO_ERROR_${code}`.

### Task Status Error Codes

Returned when a task reaches a failed terminal status during polling.

| Task Status | SDK Error Code | Description |
|-------------|---------------|-------------|
| `failed` | `GENERATION_FAILED` | Model generation failed |
| `banned` | `CONTENT_POLICY_VIOLATION` | Content policy violation |
| `expired` | `TASK_EXPIRED` | Task expired |
| `cancelled` | `TASK_CANCELED` | Task was cancelled |

### Tripo Status Mapping

| API Status | SDK TaskStatus |
|------------|---------------|
| `queued` | `PENDING` |
| `running` | `PROCESSING` |
| `success` | `SUCCEEDED` |
| `failed` | `FAILED` |
| `banned` | `FAILED` |
| `expired` | `FAILED` |
| `cancelled` | `CANCELED` |
| unknown | `PROCESSING` (fallback) |

---

## Hunyuan Error Codes

### Authentication Errors

| Hunyuan Code | SDK Error Code | Description |
|--------------|----------------|-------------|
| `AuthFailure.InvalidAuthorization` | `INVALID_AUTHORIZATION` | Invalid authorization |
| `AuthFailure.InvalidSecretId` | `INVALID_SECRET_ID` | Invalid secret ID |
| `AuthFailure.SecretIdNotFound` | `SECRET_ID_NOT_FOUND` | Secret ID not found |
| `AuthFailure.SignatureExpire` | `SIGNATURE_EXPIRED` | Signature expired |
| `AuthFailure.SignatureFailure` | `SIGNATURE_FAILURE` | Invalid signature |
| `AuthFailure.TokenFailure` | `TOKEN_FAILURE` | Token authentication failed |
| `AuthFailure.MFAFailure` | `MFA_FAILURE` | MFA verification failed |
| `AuthFailure.UnauthorizedOperation` | `UNAUTHORIZED_OPERATION` | Unauthorized operation |

### Parameter Errors

| Hunyuan Code | SDK Error Code | Description |
|--------------|----------------|-------------|
| `InvalidParameter` | `INVALID_PARAMETER` | Invalid parameter |
| `InvalidParameterValue` | `INVALID_PARAMETER_VALUE` | Invalid parameter value |
| `MissingParameter` | `MISSING_PARAMETER` | Missing required parameter |
| `UnknownParameter` | `UNKNOWN_PARAMETER` | Unknown parameter |

### Rate Limit Errors

| Hunyuan Code | SDK Error Code | Description |
|--------------|----------------|-------------|
| `RequestLimitExceeded` | `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `RequestLimitExceeded.IPLimitExceeded` | `IP_RATE_LIMIT_EXCEEDED` | IP-level rate limit |
| `RequestLimitExceeded.UinLimitExceeded` | `ACCOUNT_RATE_LIMIT_EXCEEDED` | Account-level rate limit |
| `LimitExceeded` | `LIMIT_EXCEEDED` | General limit exceeded |

### Resource Errors

| Hunyuan Code | SDK Error Code | Description |
|--------------|----------------|-------------|
| `ResourceNotFound` | `RESOURCE_NOT_FOUND` | Resource not found |
| `ResourceInUse` | `RESOURCE_IN_USE` | Resource currently in use |
| `ResourceInsufficient` | `RESOURCE_INSUFFICIENT` | Insufficient resources |
| `ResourceUnavailable` | `RESOURCE_UNAVAILABLE` | Resource unavailable |

### Operation Errors

| Hunyuan Code | SDK Error Code | Description |
|--------------|----------------|-------------|
| `FailedOperation` | `OPERATION_FAILED` | Operation failed (retry recommended) |
| `InvalidAction` | `INVALID_ACTION` | Invalid action |
| `UnsupportedOperation` | `UNSUPPORTED_OPERATION` | Unsupported operation |
| `UnauthorizedOperation` | `UNAUTHORIZED_OPERATION` | Unauthorized operation |

### Service Errors

| Hunyuan Code | SDK Error Code | Description |
|--------------|----------------|-------------|
| `InternalError` | `INTERNAL_ERROR` | Internal server error |
| `ServiceUnavailable` | `SERVICE_UNAVAILABLE` | Service unavailable |
| `ActionOffline` | `ACTION_OFFLINE` | Action has been taken offline |

### Request Errors

| Hunyuan Code | SDK Error Code | Description |
|--------------|----------------|-------------|
| `InvalidRequest` | `INVALID_REQUEST` | Invalid request |
| `RequestSizeLimitExceeded` | `REQUEST_SIZE_EXCEEDED` | Request too large |
| `ResponseSizeLimitExceeded` | `RESPONSE_SIZE_EXCEEDED` | Response too large |
| `UnsupportedProtocol` | `UNSUPPORTED_PROTOCOL` | Unsupported protocol |
| `UnsupportedRegion` | `UNSUPPORTED_REGION` | Unsupported region |

### IP Restriction Errors

| Hunyuan Code | SDK Error Code | Description |
|--------------|----------------|-------------|
| `IpInBlacklist` | `IP_BLACKLISTED` | IP is blacklisted |
| `IpNotInWhitelist` | `IP_NOT_WHITELISTED` | IP not in whitelist |

### Other Errors

| Hunyuan Code | SDK Error Code | Description |
|--------------|----------------|-------------|
| `NoSuchProduct` | `NO_SUCH_PRODUCT` | Product does not exist |
| `NoSuchVersion` | `NO_SUCH_VERSION` | API version does not exist |
| `DryRunOperation` | `DRY_RUN_OPERATION` | Dry run operation |

Unmapped codes are returned as their original Hunyuan error code.

### Task Status Error Codes

| Task Status | SDK Error Code | Description |
|-------------|---------------|-------------|
| `FAIL` | `GENERATION_FAILED` | Model generation failed |
| `CANCELED` | `TASK_CANCELED` | Task was cancelled |

### Hunyuan Status Mapping

| API Status | SDK TaskStatus |
|------------|---------------|
| `WAIT` | `PENDING` |
| `RUN` | `PROCESSING` |
| `DONE` | `SUCCEEDED` |
| `FAIL` | `FAILED` |
