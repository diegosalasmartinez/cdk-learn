import * as cdk from "aws-cdk-lib"
import * as rds from "aws-cdk-lib/aws-rds"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import * as ecs from "aws-cdk-lib/aws-ecs"
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from "constructs"

export class CdkDockerRdsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create a VPC
    const vpc = new ec2.Vpc(this, "MyVpc", {
      cidr: '30.0.0.0/16',
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ]
    })

    // Create an ECS cluster in the VPC
    const cluster = new ecs.Cluster(this, "MyCluster", {
      vpc: vpc,
    })

    // Create a private RDS instance
    const database = new rds.DatabaseInstance(this, "MyDB", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_13
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromUsername('myuser', {
        password: cdk.SecretValue.unsafePlainText('mypassword'),
      }),
      databaseName: 'mydb',
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      allocatedStorage: 10,
    })

    // Build the Docker image and push it to the ECR repository
    const dockerImage = cdk.aws_ecs.ContainerImage.fromAsset('app', {platform:Platform.LINUX_AMD64,})

    cluster.addDefaultCloudMapNamespace({
      name: 'my-namespace',
    })

    // Create a load balancer for the ECS service
    const lb = new elbv2.ApplicationLoadBalancer(this, 'MyLoadBalancer', {
      vpc,
      internetFacing: true,
      http2Enabled: true,
    });

    const listener = lb.addListener('MyListener', {
      port: 80,
      open: true,
    });

    // Create an ECS task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'MyTaskDefinition') 

    taskDefinition.addContainer('MyContainer', {
      image: dockerImage,
      environment: {
        "DB_HOST": database.dbInstanceEndpointAddress,
        "DB_PORT": database.dbInstanceEndpointPort,
        "DB_NAME": "mydb",
        "DB_USERNAME": "myuser",
        "DB_PASSWORD": "mypassword",
      },
      memoryLimitMiB: 512,
      cpu: 256,
      portMappings: [
        {
          containerPort: 80,
          protocol: ecs.Protocol.TCP,
        }
      ]
    });

    const service = new ecs.FargateService(this, 'MyService', {
      cluster,
      taskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
    })

    listener.addTargets('MyTarget', {
      port: 80,
      targets: [service],
      healthCheck: {
        path: '/',
      }
    });

    // Allow inbound traffic from the load balancer to the service
    service.connections.allowFrom(lb, ec2.Port.tcp(80), 'Load balancer access')

    // Allow inbound traffic from the service to the database
    database.connections.allowFrom(service, ec2.Port.tcp(5432), 'Service access')

    // Output the load balancer URL
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: lb.loadBalancerDnsName,
    })
  }
}
