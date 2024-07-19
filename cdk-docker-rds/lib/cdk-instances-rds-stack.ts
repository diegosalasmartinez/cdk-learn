import * as cdk from "aws-cdk-lib"
import * as rds from "aws-cdk-lib/aws-rds"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import { Construct } from "constructs"

export class CdkInstancesRdsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Create a vpc
    const vpc = new ec2.Vpc(this, "MyVpc", {
        cidr: '40.0.0.0/16',
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

    // Create a security group for the RDS instance
    const rdsSg = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
        vpc,
        allowAllOutbound: true,
        securityGroupName: 'RdsSecurityGroup',
    });

    // Allow traffic from the public subnet to the RDS isntance
    rdsSg.addIngressRule(
        ec2.Peer.ipv4(vpc.selectSubnets({subnetType: ec2.SubnetType.PRIVATE_ISOLATED}).subnetIds[0]),
        ec2.Port.tcp(5432),
        'Allow traffic from the public subnet to the RDS instance'
    )

    // Create a security group for the EC2 instance
    const ec2Sg = new ec2.SecurityGroup(this, 'Ec2SecurityGroup', {
        vpc,
        allowAllOutbound: true,
        securityGroupName: 'Ec2SecurityGroup',
    });

    // Allow traffic from the public subnet to the EC2 instance
    ec2Sg.addIngressRule(
        ec2.Peer.ipv4(vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED}).subnetIds[0]),
        ec2.Port.tcp(22),
        'Allow SSH traffic from private subnet'
    )

    // Create a network ACL for the public subnet
    const publicNacl = new ec2.NetworkAcl(this, 'PublicNacl', {
        vpc,
        subnetSelection: {subnetType: ec2.SubnetType.PUBLIC},
        networkAclName: 'PublicNacl',
    });

    publicNacl.addEntry('AllowInbound', {
        cidr: ec2.AclCidr.anyIpv4(),
        direction: ec2.TrafficDirection.INGRESS,
        ruleNumber: 100,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.tcpPort(22),
    });

    publicNacl.addEntry('AllowOutbound', {
        cidr: ec2.AclCidr.anyIpv4(),
        direction: ec2.TrafficDirection.EGRESS,
        ruleNumber: 100,
        ruleAction: ec2.Action.ALLOW,
        traffic: ec2.AclTraffic.allTraffic(),
    });
        
    publicNacl.associateWithSubnet(
        'PublicSubnet',
        {subnetType: ec2.SubnetType.PUBLIC}
    );

  }
}
