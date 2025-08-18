#!/bin/bash

source ./common.sh

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <region>"
    echo "Example: $0 us-east-1"
    exit 1
fi

export region="$1"
aws_account_id=$(aws sts get-caller-identity --query 'Account' --output text)
export account_id=$aws_account_id
echo "Using region: $region"
echo "Using environment alias: $env_alias"
echo "Using account ID: $account_id"


function create_terrafrom_s3_backend_bucket()
{

        bucket_name="doublezero-terraform-state-$account_id"
        if [[ -z $(aws s3api list-buckets  --region $region --output text --no-cli-pager | grep $bucket_name) ]];
        then
                echo "Creating S3 bucket : $bucket_name in region $region"
                aws s3api create-bucket --bucket $bucket_name --region $region --output text --no-cli-pager > /dev/null
                sleep 10
                configure_s3_bucket $bucket_name
        else
                print_warning "Terraform S3 backend already exist!!!\n"
                get_operator_approval 'Do you want to configure S3 bucket(Y/n): : ' 'y' 'Y'
                configure_s3_bucket $bucket_name

        fi
}


function configure_s3_bucket()
{

        bucket_name=$1
        echo "Enabling S3 versioning on bucket : $bucket_name"
        aws s3api put-bucket-versioning --region $region --bucket $bucket_name --versioning-configuration Status=Enabled --output text --no-cli-pager > /dev/null
        sleep 2
        echo "Tagging S3 bucket : $bucket_name"
        aws s3api put-bucket-tagging --region $region --bucket $bucket_name --tagging 'TagSet=[{Key=ResourceSharing,Value=Global},{Key=CostCenter,Value=p8},{Key=DeleteProtection,Value=ON},{Key=Category,Value=Deployment}]' --output text --no-cli-pager > /dev/null
        sleep 2
        echo "Enabling S3 kms encryption on bucket : $bucket_name"
        aws s3api put-bucket-encryption \
                --bucket $bucket_name \
                --region $region \
                --output text \
                --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}}]}' --no-cli-pager > /dev/null
        sleep 2
        echo "Blocking public access on bucket : $bucket_name"
        aws s3api put-public-access-block \
                --bucket $bucket_name \
                --region $region \
                --output text \
                --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"  --no-cli-pager > /dev/null
        sleep 2
        echo "Adding custom acl policy on bucket : $bucket_name"
        export terraform_backend_bucket_name=$bucket_name
        rm -rf ./s3_backend_acl_policy.json
        envsubst '$terraform_backend_bucket_name' < './templates/s3_backend_acl_policy.json.template' > s3_backend_acl_policy.json
        aws s3api put-bucket-policy \
                --bucket $bucket_name \
                --policy file://s3_backend_acl_policy.json \
                --region $region \
                --output text \
                --no-cli-pager > /dev/null

}
create_terrafrom_s3_backend_bucket

rm -rf ./s3_backend_acl_policy.json