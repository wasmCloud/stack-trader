# How to stand up a cluster in external services AWS

### Prerequisites
- git
- terraform >= 0.12
- Go >= 1.12
- kubectl
- Access to `criticalstack/crit` and `criticalstack/platform` repositories

## Setup Steps
1. Clone `https://github.com/criticalstack/crit` and `https://github.com/criticalstack/platform` repositories

## Crit
1. `cd crit/hack/aws`, this is where terraform and build scripts live to bootstrap a cluster in an external AWS environment. We will be using this terraform and crit to bootstrap a kubernetes cluster.
1. Under `provider "aws"` change region to desired region (default `us-east-1`)
1. Under instance type, modify to be the type of instance that you want (default `t3.medium`)
1. Under `data "aws_route53_zone" "selected"` change name to be the services hosted zone `criticalstacklabs.com.` If you run into issues with this later, then remove the `name` field and instead add `zone_id = "ZA1TKXGWZ9C1C"`.
1. Change `control_plane_endpoint` under `data "template_file" "controlplane_userdata"` to be `${var.cluster_name}.criticalstacklabs.com`
1. Change `control_plane_endpoint` under `data "template_file" "worker_userdata"` to be `${var.cluster_name}.criticalstacklabs.com`
1. Change the `subnet_id` to be `element(tolist(data.aws_subnet_ids.private.ids), count.index % length(tolist(data.aws_subnet_ids.private.ids)))` under `resource "aws_instance" "controlplane"` and `resource "aws_instance" "worker`
1. Change the owner to be `514442054488` under `data "aws_ami" "ubuntu"`
1. Change the ubuntu machine image to be `csos-ami-ubuntu*-v1.5.3` or whatever the latest CSOS AMI is. Note, for this to work, you may need to ask Jim Leary to share the AMI with the services external account, if so then you should ask him to share it to the account id `394269881776` in the region you're looking to stand up the cluster in.

## AWS
1. Create a VPC for your cluster, along with 3 private subnets and 3 public subnets. I've been using the following CIDR blocks for my HA clusters:
    - VPC: 10.100.0.0/22
    - Public subnet 1: 10.100.1.0/24
    - Public subnet 2: 10.100.2.0/24
    - Public subnet 3: 10.100.3.0/24
    - Private subnet 1: 10.100.0.0/26
    - Private subnet 2: 10.100.0.64/26
    - Private subnet 3: 10.100.0.128/26
1. Create an internet gateway and attach it to your VPC
1. Create a NAT gateway in one of your public subnets
1. Create route table for public subnets with 0.0.0.0/0 -> internet gateway, under `Subnet Associations` select your public subnets
1. Create route table for private subnets with 0.0.0.0/0 -> your nat gateway, under `Subnet Associations` select your private subnets

## Crit
1. Return to crit repository
1. Run `make apply`
1. You should have a cluster now!

## AWS
1. Launch an EC2 instance to act as your bastion host. I use one of the linux AMI's, then the free tier eligible compute instance
1. Put the EC2 in your VPC and in one of your public subnets, and then auto-assign it an elastic IP

## Local
1. Once this bastion host gets provisioned, run `ssh -i {PKEY_LOCATION} -L 6443:{CLUSTER_NAME}.criticalstacklabs.com:6443 {BASTION_PUBLIC_IP} -l {USERNAME}` in your local terminal where PKEY_LOCATION is your instance private key, CLUSTER_NAME is the name you populated in your terraform variables file, BASTION_PUBLIC_IP is the elastic IP that was assigned to your node, and USERNAME is the user that is authorized to use ssh on your bastion. For the amazon linux images, this is `ec2_user`, for the CSOS ami's this is `csos`, etc.
1. Now that you're inside your bastion, you should be able to run `ssh csos@{CONTROL_PLANE_PRIVATE_IP}` with any of your control planes. If this doesn't work, you may need to copy your private key contents on your local machine to use as the ssh private key. `~/.ssh/id_rsa`
1. Once you've `ssh`ed into your control plane, run `kubectl version` to confirm that kubernetes is running, and `kubectl get nodes` to confirm all of your master and worker nodes are connected. If your worker nodes don't show up, you may want to go into your AWS console, select the worker nodes and click `reboot` to get them to try to join again.
1. Copy the contents of `/etc/kubernetes/admin.conf` and paste them into your local machine at `~/.kube/config`, or save them as an extra configuration file if you're comfortable.
1. Edit `/etc/hosts` and insert the line `127.0.0.1   {CLUSTER_NAME}.criticalstacklabs.com` to redirect local `kubectl` calls to your tunnel, which tunnels to your control plane.
1. Now you should be able to use `kubectl` on your machine, and have the command directed to your control plane. If it stops working for whatever reason, repeat step 1 of this section.

## Platform
1. Now we're going to work in the `criticalstack/platform` repo to onboard cs-server onto our cluster.
1. Run the bash script in the `README` to install helm
1. Modify `values.yaml` with the following updates:
    - image repository should be `registry.criticalstack.com/criticalstack/cs-server` instead of `registry-dev.cstack.co/criticalstack/cs-server`
    - tag should be `latest` instead of `2.0.0-alpha.1`
    - imagePullSecrets should contain a value of `- name: cs-registry-server` instead of `[]`
    - under dockerConfig: auths:, change `registry` -> `registry.criticalstack.com`, `username: something` -> `username: ops` and `password: passwordsomething` -> `password: B33tl3ju1c3`
1. Run `make apply`

