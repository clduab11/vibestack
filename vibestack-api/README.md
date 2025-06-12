# VibeStack API

A robust, scalable, and secure backend API service for the VibeStack platform built with TypeScript, Express, and Jest.

## Features

- **TypeScript** for type safety and better developer experience
- **Express.js** for fast and minimalist web framework
- **Jest** for comprehensive testing with 100% coverage target
- **Security** best practices with Helmet, CORS, and rate limiting
- **Environment-based** configuration
- **Structured logging** with Winston
- **Input validation** with Joi
- **API documentation** with Swagger (optional)
- **Health checks** and monitoring endpoints

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (for database)
- Redis (for caching and sessions)

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd vibestack-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

## Building and Production

```bash
# Build the TypeScript code
npm run build

# Start the production server
npm start
```

## Project Structure

```
vibestack-api/
├── src/
│   ├── __tests__/        # Test files
│   │   ├── unit/         # Unit tests
│   │   └── integration/  # Integration tests
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry point
├── dist/                # Compiled JavaScript files
├── coverage/            # Test coverage reports
├── logs/               # Application logs
├── .env.example        # Environment variables template
├── jest.config.js      # Jest configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Project dependencies and scripts
```

## Testing

This project aims for 100% test coverage. Tests are organized into:

- **Unit tests**: Test individual functions and modules in isolation
- **Integration tests**: Test API endpoints and service interactions

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests in CI environment
npm run test:ci
```

## API Documentation

When enabled, API documentation is available at:
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`

## Environment Variables

See `.env.example` for all available configuration options.

## Security

- JWT-based authentication
- Request rate limiting
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers
- CORS configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Ensure all tests pass with 100% coverage
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT License - see the LICENSE file for details