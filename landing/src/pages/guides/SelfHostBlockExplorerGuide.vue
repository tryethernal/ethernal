<!--
  @fileoverview Guide: how to self-host Ethernal with Docker.
  @component SelfHostBlockExplorerGuide
  Targets "host your own block explorer", "self hosted block explorer". Every step is traced to the
  README self-hosting section, Makefile, generate-env-files.sh, docker-compose.prod.yml and the
  SelfHostedSetup*.vue screens. Rendered by the shared GuideLayout.
-->
<template>
    <GuideLayout :guide="guide" />
</template>

<script setup>
import GuideLayout from '@/components/GuideLayout.vue';

const guide = {
    slug: 'self-host-block-explorer',
    metaTitle: 'How to Self-Host a Block Explorer with Docker',
    metaDescription: 'Self-host Ethernal, an open-source EVM block explorer, with Docker Compose: clone the repo, run make start, create an admin user and your first explorer.',
    kicker: 'Self-Host a Block Explorer',
    h1: 'How to Self-Host a Block Explorer with Docker',
    intro: 'Ethernal is MIT licensed and runs on your own server with Docker Compose. Clone the repository, run make start, then open the setup page to create an admin user and your first explorer. Everything, including the database, runs in containers.',
    notice: 'The self-hosted version of Ethernal is in beta. Some features may not work as expected or may be incomplete. If you hit a problem, open an issue on GitHub.',
    needs: [
        'Docker and Docker Compose.',
        'OpenSSL, which the setup script uses to generate secrets.',
        'make, because the commands in the README use the Makefile.',
        'A domain name or the IP address of your server.',
        'The RPC URL of the EVM chain you want to explore.'
    ],
    steps: [
        {
            title: 'Clone the repository',
            text: 'Clone Ethernal and check out the latest tagged release, which is the latest stable version.',
            code: [
                'git clone https://github.com/tryethernal/ethernal.git',
                'cd ethernal',
                'git checkout $(git describe --tags --abbrev=0)'
            ]
        },
        {
            title: 'Run make start',
            text: 'On the first run, the script asks for your domain name (apex, without www) or server IP, the port to serve the app on (80 by default), and, if you entered a domain, whether to enable SSL (yes by default). It then generates the secrets and config files, pulls the images, starts the containers, creates the database and runs the migrations. Generated secrets and config files are added to .gitignore.',
            code: ['make start']
        },
        {
            title: 'Point your domain at the server',
            text: 'If you used a domain instead of an IP address, add two A records at your DNS provider that point to the public IP address of your server: one for your domain (your-domain.com) and one wildcard record (*.your-domain.com). Each explorer is served on its own subdomain of your domain, so the wildcard record is needed for explorers to be reachable.'
        },
        {
            title: 'Open the setup page',
            text: 'When make start finishes it prints a summary, including a setup link that looks like http://your-domain-or-ip/setup, plus the Bull dashboard address and credentials for background jobs. Run make info to print it again. Open the setup link in your browser.'
        },
        {
            title: 'Create the admin user',
            text: 'The first screen of the setup creates your admin user. Enter an email and a password, then click Create User.'
        },
        {
            title: 'Create your first explorer',
            text: 'Enter an Explorer Name and the RPC URL of your chain (it has to start with http:// or https://), then click Create Explorer.'
        },
        {
            title: 'Open your explorer',
            text: 'The last screen shows the address of your new explorer and links to its settings, the Ethernal dashboard and your list of explorers.'
        },
        {
            title: 'Update, stop or reset the instance',
            text: 'These are separate commands, not a sequence. To update, run make update, which pulls the latest images and applies migrations and seeds. To stop, run make stop, which stops and cleans up the containers and networks. To reset, run make nuke only if you want to start over: it is destructive and removes containers, volumes and generated config files, which deletes all your data.',
            commands: [
                { label: 'Update', code: 'make update' },
                { label: 'Stop', code: 'make stop' },
                { label: 'Reset (deletes all data)', code: 'make nuke', destructive: true }
            ]
        }
    ],
    faqs: [
        {
            q: 'Is the self-hosted version ready for production?',
            a: 'It is in beta. The README warns that some features may not work as expected or may be incomplete, and asks you to open a GitHub issue if you find a problem. Hosted Ethernal is the better fit if you need a managed service.'
        },
        {
            q: 'Do I need to install a database?',
            a: 'No. The Docker Compose file starts PostgreSQL with TimescaleDB, Redis, the background workers, the backend, the frontend and a web server together, so there is nothing to install besides Docker.'
        },
        {
            q: 'Does the self-hosted version show ads?',
            a: 'Yes, by default. The README notes that the ads help support the development of Ethernal, and asks you to keep them enabled if you can.'
        },
        {
            q: 'How do I regenerate the configuration?',
            a: 'Run bash ./generate-env-files.sh. make start only generates the config files when they are missing, so it will not overwrite them on later runs.'
        },
        {
            q: 'Where can I find the full documentation and the API reference?',
            a: 'The documentation is at doc.tryethernal.com. For the API, use the Ethernal API reference and replace api.tryethernal.com with your own server domain or IP.'
        }
    ],
    related: [
        { to: '/guides/create-block-explorer', icon: 'mdi-book-open-variant', title: 'How to Create a Block Explorer', desc: 'Compare building, self-hosting and hosted Ethernal' },
        { to: '/build-vs-buy-block-explorer', icon: 'mdi-scale-balance', title: 'Build vs Buy', desc: 'Cost and timeline of building an explorer yourself' },
        { to: '/blockscout-alternative', icon: 'mdi-swap-horizontal', title: 'Ethernal vs Blockscout', desc: 'Two open-source explorers compared on setup and runtime' },
        { to: '/launch-block-explorer', icon: 'mdi-rocket-launch-outline', title: 'Block Explorer Hosting', desc: 'Skip the servers and let Ethernal run it for you' }
    ],
    cta: { label: 'Prefer hosted? Create a free explorer' },
    secondaryCta: { label: 'View on GitHub', href: 'https://github.com/tryethernal/ethernal' }
};
</script>
