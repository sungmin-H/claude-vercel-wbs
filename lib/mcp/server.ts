import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTaskTools } from './tools/tasks';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'claude-vercel-wbs',
    version: '0.1.0',
  });
  registerTaskTools(server);
  return server;
}
