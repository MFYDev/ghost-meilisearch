#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'path';
import { loadConfig } from '@fanyangmeng/ghost-meilisearch-config';
import { GhostMeilisearchManager } from '@fanyangmeng/ghost-meilisearch-core';
import chalk from 'chalk';
import ora from 'ora';

// Create CLI program
const program = new Command();

// Set program metadata
program
  .name('ghost-meilisearch')
  .description('CLI tools for Ghost-Meilisearch integration')
  .version('0.1.0');

// Add global options
program
  .option('-c, --config <path>', 'path to configuration file', 'config.json');

// Initialize index command
program
  .command('init')
  .description('Initialize the Meilisearch index with the specified schema')
  .action(async () => {
    const options = program.opts();
    const configPath = resolve(process.cwd(), options.config);
    
    try {
      console.log(chalk.blue(`Loading configuration from ${configPath}`));
      const config = await loadConfig(configPath);
      
      const spinner = ora('Initializing Meilisearch index...').start();
      const manager = new GhostMeilisearchManager(config);
      
      await manager.initializeIndex();
      
      spinner.succeed(chalk.green('Meilisearch index initialized successfully'));
    } catch (error) {
      console.error(chalk.red('Error initializing index:'));
      console.error(error);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Sync all Ghost posts to Meilisearch')
  .action(async () => {
    const options = program.opts();
    const configPath = resolve(process.cwd(), options.config);
    
    try {
      console.log(chalk.blue(`Loading configuration from ${configPath}`));
      const config = await loadConfig(configPath);
      
      const spinner = ora('Syncing Ghost posts to Meilisearch...').start();
      const manager = new GhostMeilisearchManager(config);
      
      await manager.indexAllPosts();
      
      spinner.succeed(chalk.green('Ghost posts synced to Meilisearch successfully'));
    } catch (error) {
      console.error(chalk.red('Error syncing posts:'));
      console.error(error);
      process.exit(1);
    }
  });

// Clear command
program
  .command('clear')
  .description('Clear all documents from the Meilisearch index')
  .action(async () => {
    const options = program.opts();
    const configPath = resolve(process.cwd(), options.config);
    
    try {
      console.log(chalk.blue(`Loading configuration from ${configPath}`));
      const config = await loadConfig(configPath);
      
      const spinner = ora('Clearing Meilisearch index...').start();
      const manager = new GhostMeilisearchManager(config);
      
      await manager.clearIndex();
      
      spinner.succeed(chalk.green('Meilisearch index cleared successfully'));
    } catch (error) {
      console.error(chalk.red('Error clearing index:'));
      console.error(error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
