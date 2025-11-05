/**
 * Webpack Environment Variables Configuration Example
 * 
 * This file shows how to configure webpack to inject environment variables
 * from your .env file into the application at build time.
 * 
 * Add this to your webpack.config.js:
 */

const webpack = require('webpack')
const dotenv = require('dotenv')
const path = require('path')

// Load .env file
const env = dotenv.config({ path: path.resolve(__dirname, '../../../.env') }).parsed || {}

// Create environment variables object
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next])
  return prev
}, {})

// Example webpack config
module.exports = {
  // ... other webpack config
  
  plugins: [
    // ... other plugins
    
    // Define plugin to inject env vars
    new webpack.DefinePlugin(envKeys),
    
    // Or manually define specific vars:
    new webpack.DefinePlugin({
      'process.env.CLIENT_IDENTITY': JSON.stringify(env.CLIENT_IDENTITY || 'emc-console-dev'),
      'process.env.API_KEY': JSON.stringify(env.API_KEY || 'acom_event_service'),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ]
}

/**
 * Alternative: Runtime Injection
 * 
 * If you prefer runtime injection instead of build-time, you can inject
 * environment variables via a script tag in your index.html:
 * 
 * <script>
 *   window.EMC_ENV = {
 *     CLIENT_IDENTITY: 'your-client-identity',
 *     API_KEY: 'acom_event_service'
 *   }
 * </script>
 * 
 * The env.ts config will automatically pick these up.
 */

/**
 * Using with Adobe I/O Runtime
 * 
 * Adobe I/O Runtime apps use a different approach. Environment variables
 * should be set in the app.config.yaml file:
 * 
 * application:
 *   web:
 *     env:
 *       CLIENT_IDENTITY: $CLIENT_IDENTITY
 *       API_KEY: $API_KEY
 * 
 * Then define them in your .env file:
 * 
 * CLIENT_IDENTITY=your-client-identity
 * API_KEY=acom_event_service
 * 
 * The build process will inject these automatically.
 */

