# ClaimFlow Testing Suite

This directory contains a comprehensive testing suite for the ClaimFlow system, covering unit tests, integration tests, component tests, end-to-end tests, and performance tests.

## Test Structure

```
tests/
├── setup.ts                    # Jest setup and global configuration
├── global-setup.ts            # Global test environment setup
├── global-teardown.ts         # Global test environment cleanup
├── mocks/
│   └── server.ts              # MSW server for API mocking
├── utils/
│   └── test-helpers.tsx       # Shared test utilities and helpers
├── unit/                      # Unit tests
│   ├── auth.test.ts          # Authentication logic tests
│   └── claims.test.ts        # Claims business logic tests
├── integration/               # Integration tests
│   └── claim-submission.test.tsx  # End-to-end claim submission flow
├── components/                # Component tests
│   └── ClaimForm.test.tsx    # React component tests
├── e2e/                      # End-to-end tests
│   └── claim-workflow.test.ts # Complete user workflow tests
├── performance/              # Performance tests
│   └── load-testing.test.ts  # Load and stress testing
└── README.md                 # This file
```

## Test Categories

### Unit Tests (`tests/unit/`)
- Test individual functions and modules in isolation
- Mock external dependencies
- Focus on business logic and utility functions
- Fast execution, high coverage

**Examples:**
- Authentication utilities
- Validation functions
- Data transformation logic
- API route handlers

### Integration Tests (`tests/integration/`)
- Test interaction between multiple components
- Test API endpoints with real request/response cycles
- Test database operations (with test database)
- Test external service integrations

**Examples:**
- Complete claim submission flow
- Authentication flow with database
- File upload and processing
- Email notification sending

### Component Tests (`tests/components/`)
- Test React components in isolation
- Test user interactions and state changes
- Test component props and rendering
- Test accessibility features

**Examples:**
- Form components
- UI components
- Custom hooks
- Context providers

### End-to-End Tests (`tests/e2e/`)
- Test complete user workflows
- Test across multiple pages and components
- Test real browser interactions
- Test mobile responsiveness

**Examples:**
- Complete claim creation and submission
- User registration and login
- Claims dashboard navigation
- Document upload workflow

### Performance Tests (`tests/performance/`)
- Test system performance under load
- Test response times and throughput
- Test memory usage and resource consumption
- Test scalability limits

**Examples:**
- API endpoint load testing
- Concurrent user simulation
- Database performance testing
- Memory leak detection

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Component tests only
npm run test:components

# End-to-end tests only
npm run test:e2e

# Performance tests only
npm run test:performance
```

### CI/CD Pipeline
```bash
npm run test:ci
```

### Debug Mode
```bash
npm run test:debug
```

## Test Configuration

### Jest Configuration
The Jest configuration is defined in `package.json` and includes:
- TypeScript support with ts-jest
- JSDOM environment for React testing
- Module path mapping for imports
- Coverage thresholds (80% minimum)
- Custom matchers and utilities

### MSW (Mock Service Worker)
API mocking is handled by MSW in `tests/mocks/server.ts`:
- Intercepts HTTP requests during tests
- Provides consistent mock responses
- Supports different response scenarios
- Enables offline testing

### Test Utilities
Shared utilities in `tests/utils/test-helpers.tsx`:
- Custom render function with providers
- Mock data factories
- Common test assertions
- Helper functions for user interactions

## Writing Tests

### Test File Naming
- Unit tests: `*.test.ts`
- Component tests: `*.test.tsx`
- Integration tests: `*.test.tsx`
- E2E tests: `*.test.ts`

### Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Arrange
      const mockData = mockFactories.claim();
      
      // Act
      const result = await someFunction(mockData);
      
      // Assert
      expect(result).toBeValidClaim();
    });
  });
});
```

### Best Practices

1. **Arrange, Act, Assert**: Structure tests clearly
2. **Descriptive Names**: Use clear, descriptive test names
3. **Single Responsibility**: Each test should test one thing
4. **Mock External Dependencies**: Use mocks for external services
5. **Clean Up**: Reset mocks and state between tests
6. **Async Testing**: Properly handle async operations
7. **Error Cases**: Test both success and error scenarios
8. **Edge Cases**: Test boundary conditions and edge cases

### Custom Matchers
The test suite includes custom Jest matchers:
- `toBeValidClaim()`: Validates claim object structure
- `toHaveValidationError(field)`: Checks for validation errors

### Mock Data Factories
Use the provided factories for consistent test data:
```typescript
const mockUser = mockFactories.user({ email: 'custom@example.com' });
const mockClaim = mockFactories.claim({ status: 'SUBMITTED' });
const mockResponse = mockFactories.apiResponse(data, true);
```

## Coverage Requirements

The test suite enforces minimum coverage thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

Coverage reports are generated in the `coverage/` directory and include:
- HTML report for detailed analysis
- LCOV format for CI/CD integration
- JSON summary for programmatic access

## Continuous Integration

The test suite is designed for CI/CD pipelines:
- Fast execution with parallel test running
- Deterministic results with proper mocking
- Coverage reporting integration
- Error reporting and notifications

### GitHub Actions Example
```yaml
- name: Run Tests
  run: npm run test:ci
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Debugging Tests

### Debug Mode
```bash
npm run test:debug
```
This starts Jest with Node.js debugging enabled.

### VS Code Integration
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Common Issues

1. **Async Test Timeouts**: Increase timeout or fix async handling
2. **Mock Cleanup**: Ensure mocks are reset between tests
3. **DOM Cleanup**: Use proper cleanup in component tests
4. **Memory Leaks**: Check for unclosed resources in tests

## Performance Testing

The performance test suite includes:
- Load testing with configurable concurrency
- Response time monitoring
- Memory usage tracking
- Throughput measurement
- Error rate analysis

### Running Performance Tests
```bash
npm run test:performance
```

### Performance Metrics
- **Response Time**: Average API response time
- **Throughput**: Requests per second
- **Error Rate**: Percentage of failed requests
- **Memory Usage**: Peak memory consumption
- **CPU Usage**: Peak CPU utilization

## Maintenance

### Updating Tests
- Keep tests in sync with feature changes
- Update mock data when APIs change
- Maintain test coverage as code evolves
- Review and refactor tests regularly

### Test Data Management
- Use factories for consistent test data
- Keep test data minimal and focused
- Avoid hardcoded values where possible
- Use environment-specific test data

### Performance Monitoring
- Monitor test execution times
- Identify and optimize slow tests
- Maintain performance benchmarks
- Set up alerts for performance regressions