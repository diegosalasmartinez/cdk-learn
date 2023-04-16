import { aws_ecs as ecs } from 'aws-cdk-lib';
// import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { App, Stack } from 'aws-cdk-lib';
// import { DynamoDbTable } from './infrastructure/dynamodb-table';

import {
  Container,
  Environment,
  HttpLoadBalancerExtension,
  Service,
  ServiceDescription
} from '@aws-cdk-containers/ecs-service-extensions';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';

const app = new App();
const stack = new Stack(app, 'docker-demo');

const environment = new Environment(stack, 'production');

/** Define the service */
const serviceDescription = new ServiceDescription();

// Add the container
serviceDescription.add(new Container({
  cpu: 1024,
  memoryMiB: 2048,
  trafficPort: 80,
  image: ecs.ContainerImage.fromAsset('app', {platform:Platform.LINUX_AMD64,})
}));

// Add a DynamoDB table
// hitCounterDescription.add(new DynamoDbTable('hits', {
//   partitionKey: {
//     name: 'counter',
//     type: dynamodb.AttributeType.STRING,
//   },
//   billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
// }));

// Add a load balancer
serviceDescription.add(new HttpLoadBalancerExtension());

// Add the service to the production environment.
new Service(stack, 'docker-demo', {
  environment: environment,
  serviceDescription: serviceDescription,
});
