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
  .version('1.2.3');

// Add global options
program
  .option('-c, --config <path>', 'path to configuration file', 'config.json');

// Helper function to execute commands with the manager
async function executeWithConfig(action: (manager: GhostMeilisearchManager) => Promise<void>, actionName: string) {
  const options = program.opts();
  const configPath = resolve(process.cwd(), options.config);
  const spinner = ora();
  
  try {
    console.log(chalk.blue(`Loading configuration from ${configPath}`));
    const config = await loadConfig(configPath);
    
    spinner.start(`${actionName}...`);
    const manager = new GhostMeilisearchManager(config);
    
    await action(manager);
    
    spinner.succeed(chalk.green(`${actionName} completed successfully`));
  } catch (error) {
    spinner.fail(chalk.red(`Error during ${actionName.toLowerCase()}`));
    
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
      if (error.stack) {
        console.error(chalk.gray(error.stack.split('\n').slice(1).join('\n')));
      }
    } else {
      console.error(chalk.red('An unknown error occurred'));
    }
    
    process.exit(1);
  }
}

// Initialize index command
program
  .command('init')
  .description('Initialize the Meilisearch index with the specified schema')
  .action(() => {
    executeWithConfig(
      (manager) => manager.initializeIndex(), 
      'Initializing Meilisearch index'
    );
  });

// Sync command
program
  .command('sync')
  .description('Sync all Ghost posts to Meilisearch')
  .action(() => {
    executeWithConfig(
      (manager) => manager.indexAllPosts(), 
      'Syncing Ghost posts to Meilisearch'
    );
  });

// Clear command
program
  .command('clear')
  .description('Clear all documents from the Meilisearch index')
  .action(() => {
    executeWithConfig(
      (manager) => manager.clearIndex(), 
      'Clearing Meilisearch index'
    );
  });

// Index single post command
program
  .command('index-post <postId>')
  .description('Index a single Ghost post by ID')
  .action((postId: string) => {
    executeWithConfig(
      (manager) => manager.indexPost(postId),
      `Indexing post ${postId}`
    );
  });

// Delete single post command
program
  .command('delete-post <postId>')
  .description('Delete a single Ghost post from the index by ID')
  .action((postId: string) => {
    executeWithConfig(
      (manager) => manager.deletePost(postId),
      `Deleting post ${postId} from index`
    );
  });

// Parse command line arguments
program.parse();