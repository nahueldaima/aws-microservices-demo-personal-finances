
# 2020 - AWS Lambda and API Gateway SAM Template for Demo Personal Finances

This README provides instructions on how to understand, set up, and deploy the provided `template.yaml` file using AWS SAM (Serverless Application Model). The template sets up an API Gateway and multiple Lambda functions for your domain.

## Prerequisites

Before you begin, ensure you have the following:

1. **AWS CLI**: Installed and configured with your credentials.
2. **AWS SAM CLI**: Installed on your local machine.
3. **Node.js**: Version 18.x or higher installed.
4. **AWS Account**: With necessary permissions to create Lambda functions, API Gateway, and IAM roles.
5. **SSL Certificate**: ARN for your domain's SSL certificate.

## Setup Instructions

1. **Clone the Repository**: Clone the repository containing the `template.yaml` file to your local machine.
   
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Update Parameters**: Open `template.yaml` and update the placeholders with your specific values.
   
   - `your-domain-name.com`: Your domain name.
   - `your-certificate-arn`: ARN of your SSL certificate.
   - `yourAuthCustomFunction`: Your custom authorizer Lambda function name.
   - `yourSecretManagerName`: Name of your Secrets Manager.
   - `XXXXXXXXXXX`: Your AWS Account ID.

## Deployment Instructions

1. **Package the Application**: Use SAM to package the application. This will upload your code to an S3 bucket and generate a packaged template.

   ```bash
   sam build
   ```

2. **Deploy the Application**: Deploy the packaged application using SAM.

   ```bash
   sam deploy
   ```

3. **Monitor the Deployment**: Monitor the progress in the AWS CloudFormation console to ensure all resources are created successfully.

## Function Descriptions

### API Gateway

- **financesAPI**: Sets up an API Gateway with various endpoints for different resources like `auth`, `coins`, `balances`, `economies`, `stashes`, `transactions`, and `users`.

### Lambda Functions

- **Auth Functions**: Handles authentication (e.g., `login`).
- **Coins Functions**: Manages coin-related operations (e.g., `create`, `get`, `latestExchange`, `updateRates`).
- **Balances Functions**: Manages balance-related operations (e.g., `balanceTransactions`, `balanceTransactionsByStashOrEconomy`, `balanceTransactionsByCategories`).
- **Economies Functions**: Manages economy-related operations (e.g., `create`, `getAll`).
- **Stashes Functions**: Manages stash-related operations (e.g., `create`, `edit`, `getAll`, `categoriesCreate`, `categoriesEdit`).
- **Transactions Functions**: Manages transaction-related operations (e.g., `create`, `update`, `batchCreate`, `filter`, `categoriesCreate`, `categoriesEdit`, `categoriesFilter`, `categoriesGroupsCreate`, `categoriesGroupsEdit`, `categoriesGroupsFilter`, `transfersCreate`, `transfersFilter`).
- **Users Functions**: Manages user-related operations (e.g., `create`, `getOne`, `firstTime`).

### Layers

- **sharedDependenciesLayer**: Contains common dependencies for the Lambda functions. This layer is shared across all functions and its located on dependencies/nodejs/libs/

## Security and Permissions

- Ensure the IAM roles specified in the template have the necessary permissions to execute the Lambda functions and interact with other AWS services.

## Cleanup

To delete the resources created by the stack, use the AWS CLI or the AWS Management Console to delete the CloudFormation stack.

```bash
aws cloudformation delete-stack --stack-name <your-stack-name>
```

## Support

For any issues or questions, please let me know!
