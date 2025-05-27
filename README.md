# GAAS - AWS Amplify Gen 2 Project

This is a modern web application built with Next.js and AWS Amplify Gen 2, featuring authentication, data storage, and file storage capabilities.

## 🚀 Features

- **Authentication**: Secure user authentication with email-based login
- **Data Storage**: Managed data storage with GraphQL API
- **File Storage**: Secure file storage with authenticated access
- **Modern UI**: Built with Next.js and React
- **TypeScript**: Full TypeScript support for better development experience

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18
- **Backend**: AWS Amplify Gen 2
- **Authentication**: Amazon Cognito
- **Storage**: Amazon S3
- **Database**: Amazon DynamoDB and RDS
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js (Latest LTS version recommended)
- AWS Account
- AWS Amplify CLI
- Git

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd GAAS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure AWS Amplify**
   ```bash
   amplify configure
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Project Structure

```
GAAS/
├── amplify/              # Amplify backend configuration
│   ├── auth/            # Authentication configuration
│   ├── data/            # Data models and API
│   └── storage/         # Storage configuration
├── app/                 # Next.js application code
├── public/             # Static assets
└── package.json        # Project dependencies
```

## 🔐 Authentication

The application uses AWS Cognito for authentication with the following configuration:
- Email-based login
- Required user attributes:
  - Email
  - Preferred Username
- Optional user attributes:
  - Phone Number

## 💾 Data Storage

The application includes a Todo model with the following schema:
- Content (String)
- Owner-based authorization

## 📦 File Storage

File storage is configured with the following access patterns:
- Authenticated users can read, write, and delete files
- Files are stored in the 'files/*' path

## 🚀 Deployment

The application is configured for deployment using AWS Amplify Console. The deployment process is automated through the `amplify.yml` configuration file.

## 📚 Documentation

Additional documentation is available in the following files:
- `AWS Amplify Gen 2 Deployment Guide.pdf`
- `User Manual.pdf`
- `Cloud Watch Dashboard and Alarms.pdf`
- `CC-Architecture Diagram.pdf`
- `Acessandusers.pdf`

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the terms of the license included in the [LICENSE](LICENSE) file.

## 🆘 Support

For support, please refer to the documentation files in the project root or create an issue in the repository.
