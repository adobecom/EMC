/**
 * EMC (Event Management Console) - Unified Shell Solution Configuration
 * 
 * This configuration tells the Unified Shell how to work with the EMC application.
 * It defines how the application should be mounted on experience.adobe.com,
 * how the history data should be synchronized, authentication settings, and more.
 * 
 * IMPORTANT: This file needs to be submitted to the Unified Shell repository
 * at: packages/unified-shell/src/js/solutions/emc.ts
 * and exported from the solutions index.ts file.
 * 
 * For custom IMS to work, you need to:
 * 1. Register an IMS client with IDOPS/IMSS
 * 2. Get the client_id approved
 * 3. Submit this config as a PR to the Unified Shell repo
 * 4. Coordinate with Unified Shell team for approval
 */

// These imports would come from the Unified Shell repo
// import { HISTORY, PDH_GLOBAL, Solution, THUNDERBIRD } from '@exc/core/src/models/Solution';

/**
 * Type definitions for Solution configuration
 * (These match the Unified Shell's internal types)
 */
export enum HISTORY {
  HASH = 'hash',
  HISTORY = 'history',
  SERVER = 'server'
}

export enum PDH_GLOBAL {
  WEBSDK = 'websdk',
  AA = 'aa',
  BOTH = 'both'
}

export enum THUNDERBIRD {
  SERVICE_WORKER = 'service_worker',
  DISABLED = 'disabled'
}

export interface SolutionAccess {
  code?: string[];
  codeLogicOp?: 'AND' | 'OR';
  fi?: string[];
  fiLogicOp?: 'AND' | 'OR';
  flag?: string;
  logicOp?: 'AND' | 'OR';
}

export interface HistoryConfig {
  type: HISTORY;
  config?: {
    absolutePaths?: boolean;
    addParamsToHash?: boolean;
    hashType?: 'slash' | 'noslash';
    spinnerOnChange?: boolean;
  };
}

export interface IMSConfig {
  client_id: string;
  scopes: string;
  // Optional: environment-specific overrides
  dev?: { client_id: string; scopes: string };
  qa?: { client_id: string; scopes: string };
  stage?: { client_id: string; scopes: string };
  prod?: { client_id: string; scopes: string };
}

export interface SandboxConfig {
  hideInitialSpinner?: boolean;
  history?: HistoryConfig | HISTORY;
  ims?: IMSConfig;
  pathPrefix?: { default?: string; dev?: string };
  sources: {
    dev: string;
    qa?: string;
    stage: string;
    prod: string;
  };
  pageTimeout?: number;
}

export interface Solution {
  access: SolutionAccess;
  appId: string;
  distributionList: string;
  experienceLeague?: {
    communities: string;
    filter: string;
  };
  name: string;
  path: string;
  permissionsPolicy?: string[];
  redirectFrom?: Array<{ path: string; options?: Record<string, unknown> }>;
  serviceCode: string;
  thunderbird?: THUNDERBIRD;
  analytics?: { omegaGlobal: PDH_GLOBAL; omegaSuiteId?: string };
  gainsight?: { productKey: string };
  sandbox: SandboxConfig;
  urlContext?: {
    key: 'sandbox' | 'subOrg';
    config?: {
      id: string;
      name: string;
      preferred: string;
      serviceCode: string;
      customIdName?: string;
    };
    optional?: boolean;
  };
  spaAppId?: string;
  releaseType?: 'POC' | 'DEV' | 'ALPHA' | 'BETA' | 'GA';
  appRoot?: string;
  helpCenter?: {
    suppressedTabs?: string[];
  };
}

/**
 * EMC (Event Management Console) Solution Configuration
 * 
 * UPDATE THESE VALUES with your actual IMS client information:
 * - client_id: Your registered IMS client ID from IDOPS/IMSS
 * - scopes: Approved OAuth scopes for your client
 * - serviceCode: Your provisioned service code
 */
const emcConfig: Solution = {
  // ============================================================================
  // ACCESS CONTROL
  // ============================================================================
  // Defines how organizations have access to EMC
  // code: IMS profile projectedProductContext service codes required
  access: {
    code: ['dma_aem_cloud'],  // TODO: Update with your actual service code
    // fi: ['acp:cjm_foundation'], // Optional: fulfillable items
    // flag: 'emc-feature-flag',   // Optional: feature flag for gradual rollout
  },

  // ============================================================================
  // APPLICATION IDENTITY
  // ============================================================================
  appId: 'emc',
  name: 'emc',
  path: '/emc',  // Mount path on experience.adobe.com (e.g., experience.adobe.com/#/@tenant/emc)
  
  // Service code associated with EMC in IMS
  serviceCode: 'dma_aem_cloud',  // TODO: Update with your actual service code
  
  // Distribution list for updates from Unified Shell
  distributionList: 'Grp-emc-dev',  // TODO: Update with your team's distribution list

  // ============================================================================
  // RELEASE STATUS
  // ============================================================================
  // Options: 'POC', 'DEV', 'ALPHA', 'BETA', 'GA'
  releaseType: 'BETA',

  // ============================================================================
  // ANALYTICS & TRACKING
  // ============================================================================
  analytics: {
    omegaGlobal: PDH_GLOBAL.WEBSDK  // Use Web SDK for CJA reporting
  },
  
  // Optional: Gainsight integration for user guides/metrics
  // gainsight: {
  //   productKey: 'AP-XXXXXXXXXX-X'  // Your Gainsight product key
  // },

  // ============================================================================
  // EXPERIENCE LEAGUE INTEGRATION
  // ============================================================================
  experienceLeague: {
    communities: 'adobe-experience-manager',
    filter: 'AEM'  // Search filter for contextual help
  },

  // ============================================================================
  // SANDBOX / IFRAME CONFIGURATION
  // ============================================================================
  sandbox: {
    // -------------------------------------------------------------------------
    // HISTORY MANAGEMENT
    // -------------------------------------------------------------------------
    // Defines how URL history is synchronized between shell and iframe
    history: {
      type: HISTORY.HASH,  // App uses hash router (React Router HashRouter)
      config: {
        addParamsToHash: true  // Preserve query params in hash
      }
    },

    // -------------------------------------------------------------------------
    // CUSTOM IMS CONFIGURATION
    // -------------------------------------------------------------------------
    // ⚠️ IMPORTANT: Update these with your registered IMS client credentials
    // You MUST register this client with IDOPS/IMSS before it will work
    ims: {
      // Default client for all environments
      client_id: 'emc-console',  // TODO: Replace with your IDOPS-registered client ID
      scopes: 'openid,AdobeID,additional_info.projectedProductContext',
      
      // Optional: Environment-specific overrides
      // dev: {
      //   client_id: 'emc-console-dev',
      //   scopes: 'openid,AdobeID,additional_info.projectedProductContext'
      // },
      // stage: {
      //   client_id: 'emc-console-stage',
      //   scopes: 'openid,AdobeID,additional_info.projectedProductContext'
      // },
      // prod: {
      //   client_id: 'emc-console-prod',
      //   scopes: 'openid,AdobeID,additional_info.projectedProductContext,read_organizations'
      // }
    },

    // -------------------------------------------------------------------------
    // SOURCE URLS
    // -------------------------------------------------------------------------
    // URLs where the application is deployed for each environment
    sources: {
      dev: 'https://14257-emc-dev.adobeio-static.net',
      qa: 'https://14257-emc-dev.adobeio-static.net',  // Using dev for QA, update if different
      stage: 'https://14257-emc-stage.adobeio-static.net',
      prod: 'https://14257-emc-production.adobeio-static.net'
    },

    // -------------------------------------------------------------------------
    // TIMEOUT CONFIGURATION
    // -------------------------------------------------------------------------
    // Time in ms to wait for app initialization before showing timeout error
    // Default: 25s prod/stage, 90s other environments
    pageTimeout: 30000
  },

  // ============================================================================
  // OPTIONAL CONFIGURATIONS
  // ============================================================================

  // Path prefix (if needed)
  // sandbox.pathPrefix: { default: '/prefix' }

  // Redirect old paths to new path
  // redirectFrom: [{ path: '/old-emc-path' }],

  // Permissions policy for iframe (fullscreen, clipboard included by default)
  // permissionsPolicy: ['camera', 'microphone'],

  // URL context (for sandboxes or sub-orgs)
  // urlContext: {
  //   key: 'sandbox',
  //   optional: true
  // }
};

export default emcConfig;

/**
 * ============================================================================
 * INSTRUCTIONS FOR UNIFIED SHELL REGISTRATION
 * ============================================================================
 * 
 * To register this solution configuration with Unified Shell:
 * 
 * 1. REGISTER IMS CLIENT (Required First!)
 *    - Open IDOPS/IMSS ticket to register 'emc-console' IMS client
 *    - Request TOU (Terms of Use) = 'dma'
 *    - Configure redirect URLs:
 *      - https://experience.adobe.com/*
 *      - https://experience-stage.adobe.com/*
 *      - https://experience-qa.adobe.com/*
 *    - Request scopes: openid, AdobeID, additional_info.projectedProductContext
 *    - Wait for approval (1-2 weeks)
 * 
 * 2. SUBMIT UNIFIED SHELL PR
 *    - Clone unified-shell repo
 *    - Copy this config to: packages/unified-shell/src/js/solutions/emc.ts
 *    - Update imports to use actual Unified Shell types:
 *      import { HISTORY, PDH_GLOBAL, Solution } from '@exc/core/src/models/Solution';
 *    - Export from: packages/unified-shell/src/js/solutions/index.ts
 *      export { default as emc } from './emc';
 *    - Update VALID_APPID_LIST in validate.test.ts
 *    - Submit PR and coordinate with Unified Shell team
 * 
 * 3. COORDINATE WITH TEAMS
 *    - IDOPS/IMSS: IMS client registration
 *    - Unified Shell: Solution config approval
 *    - AEM Cloud team (if applicable): CSP and frame-src settings
 * 
 * 4. TEST IN STAGE
 *    - Deploy to stage environment
 *    - Access via: https://experience-stage.adobe.com/#/@your-org/emc
 *    - Verify:
 *      - No additional login prompts
 *      - IMS token contains correct scopes
 *      - All API calls work correctly
 * 
 * ============================================================================
 * COMMON SCOPES
 * ============================================================================
 * - openid: Basic OpenID Connect authentication (required)
 * - AdobeID: Adobe ID access (required)
 * - additional_info.projectedProductContext: Product context and entitlements
 * - read_organizations: Read organization details
 * - creative_sdk: Creative Cloud SDK access
 * - read_pc.dma_aem_ams: AEM-specific scopes
 * 
 * ============================================================================
 * SERVICE CODES
 * ============================================================================
 * Common service codes for access control:
 * - dma_aem_cloud: AEM Cloud Service
 * - dma_analytics: Adobe Analytics
 * - dma_campaign: Adobe Campaign
 * - dma_audiencemanager: Audience Manager
 * 
 * Check with your provisioning team for the correct service code.
 */

