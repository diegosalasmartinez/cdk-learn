import * as cdk from 'aws-cdk-lib';
import {
  Container,
  Environment,
  HttpLoadBalancerExtension,
  Service,
  ServiceDescription
} from '@aws-cdk-containers/ecs-service-extensions';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';

export class HelloWorldStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = new Environment(this, 'production');

    const serviceDescription = new ServiceDescription();

    // Add the container
    serviceDescription.add(new Container({
      cpu: 1024,
      memoryMiB: 2048,
      trafficPort: 80,
      image: cdk.aws_ecs.ContainerImage.fromAsset('app', {platform:Platform.LINUX_AMD64,})
    }));

    // Add a load balancer
    serviceDescription.add(new HttpLoadBalancerExtension());

    // Add the service to the production environment.
    new Service(this, 'docker-demo', {
      environment: environment,
      serviceDescription: serviceDescription,
    });
  }
}
