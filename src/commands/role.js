const fromPairs = require('lodash.frompairs');
const toPairs = require('lodash.topairs');
const isEmpty = require('lodash.isempty');
const chalk = require('chalk');
const { Command, flags } = require('@oclif/command');
const sharedIniFileLoader = require('@aws-sdk/shared-ini-file-loader');
const AWS = require('@aws-sdk/client-iam');
const inquirer = require('inquirer');
const { cli } = require('cli-ux');
const { api } = require('../api');

const AWS_API_VERSION = '2010-05-08';

class RoleCommand extends Command {
  /**
   * Gets the list of AWS configurations available in the system
   *
   * @returns {Promise<Object>}
   */
  async getAwsConfigs() {
    if (this._awsConfigs) {
      return this._awsConfigs;
    }

    this._awsConfigs = await sharedIniFileLoader.loadSharedConfigFiles();
    return this._awsConfigs;
  }

  /**
   * Returns the list of available AWS profiles that have filled in access keys
   *
   * @returns {Promise<Object>}
   */
  async getProfiles() {
    if (this._profiles) {
      return this._profiles;
    }

    // Pick all the profiles in all files (as returned by the AWS sdk) that have valid credentials
    const awsConfigs = await this.getAwsConfigs();
    this._profiles = fromPairs(Object.values(awsConfigs).map(
      cfg => toPairs(cfg),
    ).reduce(
      (a, b) => ([...a, ...b]), [],
    ).filter(
      ([, cfg]) => !!cfg.aws_access_key_id && !!cfg.aws_secret_access_key,
    ));

    return this._profiles;
  }

  /**
   * Creates an AWS IAM role to use with Stackmate.io
   *
   * @param {String} accessKeyId the AWS Access Key ID to use
   * @param {String} secretAccessKey The AWS Secret Access Key to use
   * @returns {Promise<Object>}
   */
  async createIamRole(accessKeyId, secretAccessKey) {
    const {
      external_id: externalId,
      seesion_duration: sessionDuration,
      assume_role_policy: assumeRolePolicy,
      inline_policy: inlinePolicy,
      settings_url: settingsUrl,
    } = await api.getIamPermissions();

    const { roleName, policyName } = await inquirer.prompt([{
      name: 'roleName',
      default: 'StackmateUser',
    }, {
      name: 'policyName',
      default: 'StackmateUserPolicy',
    }]);

    const client = new AWS.IAM({
      // Create the role and store it in the configuration file
      apiVersion: AWS_API_VERSION,
      credentials: { accessKeyId, secretAccessKey },
    });

    const [awsRoleName, awsPolicyName] = [roleName, policyName].map(
      s => s.replace(/([^\w+]|[\s]+)/gi, '-'),
    );

    cli.action.start(`Creating IAM role ${roleName}`);
    let updated = false;
    let roleArn;

    try {
      ({ Role: { Arn: roleArn } } = await client.createRole({
        RoleName: awsRoleName,
        AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
        Path: '/',
        Description: 'Generated by Stackmate.io CLI',
        MaxSessionDuration: sessionDuration,
        Tags: [{
          Key: 'Name',
          Value: awsRoleName,
        }],
      }));
    } catch (err) {
      if (err.name !== 'EntityAlreadyExists') {
        throw err;
      }

      // Role already exists
      this.warn(`The role ${awsRoleName} already exists, will update the policy instead`);
      updated = true;
    }

    cli.action.stop(chalk.green('Done!'));

    cli.action.start(`Attaching the Policy to the role ${roleName}`);

    await client.putRolePolicy({
      PolicyDocument: JSON.stringify(inlinePolicy),
      PolicyName: awsPolicyName,
      RoleName: awsRoleName,
    });

    cli.action.stop(chalk.green('Done!'));

    this.log(`AWS IAM role was successfully ${updated ? 'updated' : 'created'}.`, '\n');

    if (updated) {
      return this.log(
        'We assume that the role has already been integrated to Stackmate.io',
        'If not, please remove this role from the AWS console and re-run this operation',
      );
    }

    this.log('Role ARN', chalk.bold(roleArn));
    this.log('External ID', chalk.bold(externalId));
    this.warn('Please note: The External ID is not shown again!!!', '\n');

    this.log(
      'We will now open your browser for you to add the integration to Stackmate.io settings',
    );

    await cli.anykey();

    return cli.open(`${settingsUrl}?arn=${roleArn}&externalId=${externalId}`);
  }

  /**
   * Runs the command
   */
  async run() {
    let selectedProfile;
    let accessKeyId;
    let secretAccessKey;

    this.log(
      chalk.green('Welcome to Stackmate CLI'), '\n',
      'Stackmate needs to create an AWS IAM role that will be used to deploy your resources', '\n',
      'By creating this role and adding it to your integrations, we will be able', '\n',
      'to use your AWS account on your behalf, without providing us your AWS credentials', '\n',
    );

    ({ flags: { profile: selectedProfile } } = this.parse(RoleCommand));

    // Get profiles that are stored in local AWS configuration
    const profiles = await this.getProfiles();

    if (!selectedProfile) {
      // The user didn't pass an AWS profile as an option to the command
      const otherOption = 'other';
      const promptAttrs = {
        name: 'profile',
        message: 'Select an AWS profile to add the role to',
      };

      if (!isEmpty(profiles)) {
        // Profiles are available, give the user the option to select one
        this.log(
          chalk.green('Cool!'),
          'looks like you have been using AWS on this computer, you can select a profile from the list',
          '\n',
        );

        Object.assign(promptAttrs, {
          type: 'list',
          choices: [...Object.keys(profiles).map(name => ({ name })), { name: otherOption }],
        });
      }

      ({ profile: selectedProfile } = await inquirer.prompt([promptAttrs]));

      if (selectedProfile === otherOption) {
        selectedProfile = null;
      }
    }

    if (selectedProfile) {
      // The user has provided a profile that doesn't exist in the list of available ones
      if (!Object.keys(profiles).includes(selectedProfile)) {
        return this.error(
          `The AWS Profile ${selectedProfile} could not be found`,
        );
      }

      ({
        aws_access_key_id: accessKeyId, aws_secret_access_key: secretAccessKey,
      } = profiles[selectedProfile]);
    } else {
      // We don't have an AWS profile selected, ask the user to input their AWS access key & secret
      this.log(
        chalk.yellow('Notice'),
        'We couldn’t find any AWS profile to be used, you’ll have to provide the AWS Credentials',
        'of the account to create the Role for',
      );

      ({ accessKeyId, secretAccessKey } = await inquirer.prompt([
        {
          name: 'accessKeyId',
          message: 'AWS Access Key Id to use',
          type: 'input',
        },
        {
          name: 'secretAccessKey',
          message: 'AWS Secret Access Key to use',
          type: 'input',
        },
      ]));
    }

    if (!accessKeyId || !secretAccessKey) {
      return this.error('We weren’t able to determine your AWS credentials. Please start over');
    }

    return this.createIamRole(accessKeyId, secretAccessKey);
  }
}

RoleCommand.description = `
adds an AWS role to stackmate.io
`.trim();

RoleCommand.flags = {
  profile: flags.string({
    char: 'p',
    description: 'The AWS profile to use',
  }),
};

module.exports = RoleCommand;
