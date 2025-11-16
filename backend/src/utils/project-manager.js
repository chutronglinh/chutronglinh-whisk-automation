import axios from 'axios';

const API_ENDPOINT = 'https://labs.google/fx/api/trpc/media.createOrUpdateWorkflow';
const TOOL_NAME = 'BACKBONE';
const ORIGIN = 'https://labs.google';
const REFERER = 'https://labs.google/fx/tools/whisk';

export class ProjectManager {
  constructor(sessionCookie) {
    this.sessionCookie = sessionCookie;
  }

  generateSessionId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `j${timestamp}${random}`;
  }

  async createProject(projectName) {
    const response = await axios.post(API_ENDPOINT, {
      json: {
        clientContext: {
          tool: TOOL_NAME,
          sessionId: this.generateSessionId()
        },
        mediaGenerationIdsTopCopy: [],
        workflowMetadata: { workflowName: projectName }
      }
    }, {
      headers: {
        'Cookie': `__Secure-next-auth.session-token=${this.sessionCookie}`,
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'Referer': REFERER,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const workflowId = response.data?.result?.data?.json?.result?.workflowId;
    if (!workflowId) {
      throw new Error('Invalid response: workflowId not found');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    if (!uuidRegex.test(workflowId)) {
      throw new Error(`Invalid workflowId format: ${workflowId}`);
    }

    return workflowId;
  }
}