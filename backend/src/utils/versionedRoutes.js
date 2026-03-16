const express = require('express');
const { versionManager, createVersionedResponse, createVersionedError } = require('../utils/apiVersioning');

// Versioned Router Factory
class VersionedRouter {
  constructor() {
    this.routers = new Map();
    this.defaultVersion = versionManager.config.defaultVersion;
  }
  
  // Create or get router for version
  getRouter(version) {
    if (!this.routers.has(version)) {
      this.routers.set(version, express.Router());
    }
    return this.routers.get(version);
  }
  
  // Add route to specific version
  addRoute(version, method, path, ...handlers) {
    const router = this.getRouter(version);
    const fullPath = `/api/${version}${path}`;
    
    // Wrap handlers with versioning support
    const wrappedHandlers = handlers.map(handler => (req, res, next) => {
      // Set version in response locals
      res.locals.version = version;
      
      // Wrap response methods
      const originalJson = res.json;
      res.json = (data) => {
        if (data && typeof data === 'object' && !data.version) {
          return originalJson.call(res, createVersionedResponse(res, data));
        }
        return originalJson.call(res, data);
      };
      
      // Wrap error handling
      try {
        handler(req, res, next);
      } catch (error) {
        createVersionedError(res, error, 500);
      }
    });
    
    router[method](path, ...wrappedHandlers);
    return this;
  }
  
  // Add route to all versions
  addRouteToAllVersions(method, path, ...handlers) {
    for (const version of versionManager.getSupportedVersions()) {
      this.addRoute(version, method, path, ...handlers);
    }
    return this;
  }
  
  // Add route to specific versions only
  addRouteToVersions(versions, method, path, ...handlers) {
    for (const version of versions) {
      if (versionManager.isValidVersion(version)) {
        this.addRoute(version, method, path, ...handlers);
      }
    }
    return this;
  }
  
  // Add route with version-specific logic
  addVersionedRoute(method, path, versionHandlers) {
    for (const [version, handler] of Object.entries(versionHandlers)) {
      if (versionManager.isValidVersion(version)) {
        this.addRoute(version, method, path, handler);
      }
    }
    return this;
  }
  
  // Get all routers
  getAllRouters() {
    const result = {};
    for (const [version, router] of this.routers.entries()) {
      result[version] = router;
    }
    return result;
  }
}

// Route Method Aliases
VersionedRouter.prototype.get = function(path, ...handlers) {
  return this.addRouteToAllVersions('get', path, ...handlers);
};

VersionedRouter.prototype.post = function(path, ...handlers) {
  return this.addRouteToAllVersions('post', path, ...handlers);
};

VersionedRouter.prototype.put = function(path, ...handlers) {
  return this.addRouteToAllVersions('put', path, ...handlers);
};

VersionedRouter.prototype.patch = function(path, ...handlers) {
  return this.addRouteToAllVersions('patch', path, ...handlers);
};

VersionedRouter.prototype.delete = function(path, ...handlers) {
  return this.addRouteToAllVersions('delete', path, ...handlers);
};

// Version-specific methods
VersionedRouter.prototype.v1 = function(path, ...handlers) {
  return this.addRoute('v1', 'get', path, ...handlers);
};

VersionedRouter.prototype.v1Post = function(path, ...handlers) {
  return this.addRoute('v1', 'post', path, ...handlers);
};

VersionedRouter.prototype.v1Put = function(path, ...handlers) {
  return this.addRoute('v1', 'put', path, ...handlers);
};

VersionedRouter.prototype.v1Patch = function(path, ...handlers) {
  return this.addRoute('v1', 'patch', path, ...handlers);
};

VersionedRouter.prototype.v1Delete = function(path, ...handlers) {
  return this.addRoute('v1', 'delete', path, ...handlers);
};

VersionedRouter.prototype.v2 = function(path, ...handlers) {
  return this.addRoute('v2', 'get', path, ...handlers);
};

VersionedRouter.prototype.v2Post = function(path, ...handlers) {
  return this.addRoute('v2', 'post', path, ...handlers);
};

VersionedRouter.prototype.v2Put = function(path, ...handlers) {
  return this.addRoute('v2', 'put', path, ...handlers);
};

VersionedRouter.prototype.v2Patch = function(path, ...handlers) {
  return this.addRoute('v2', 'patch', path, ...handlers);
};

VersionedRouter.prototype.v2Delete = function(path, ...handlers) {
  return this.addRoute('v2', 'delete', path, ...handlers);
};

// Version-specific methods with multiple versions
VersionedRouter.prototype.version = function(versions, method, path, ...handlers) {
  return this.addRouteToVersions(versions, method, path, ...handlers);
};

VersionedRouter.prototype.versioned = function(method, path, versionHandlers) {
  return this.addVersionedRoute(method, path, versionHandlers);
};

// Create versioned router instance
const versionedRouter = new VersionedRouter();

// Versioned Route Builder
class VersionedRouteBuilder {
  constructor(basePath = '') {
    this.basePath = basePath;
    this.routes = [];
  }
  
  // Add route to specific version
  version(version, method, path, ...handlers) {
    this.routes.push({
      version,
      method,
      path: this.basePath + path,
      handlers
    });
    return this;
  }
  
  // Add GET route
  get(version, path, ...handlers) {
    return this.version(version, 'get', path, ...handlers);
  }
  
  // Add POST route
  post(version, path, ...handlers) {
    return this.version(version, 'post', path, ...handlers);
  }
  
  // Add PUT route
  put(version, path, ...handlers) {
    return this.version(version, 'put', path, ...handlers);
  }
  
  // Add PATCH route
  patch(version, path, ...handlers) {
    return this.version(version, 'patch', path, ...handlers);
  }
  
  // Add DELETE route
  delete(version, path, ...handlers) {
    return this.version(version, 'delete', path, ...handlers);
  }
  
  // Add route to multiple versions
  versions(versions, method, path, ...handlers) {
    for (const version of versions) {
      this.version(version, method, path, ...handlers);
    }
    return this;
  }
  
  // Add route with version-specific handlers
  versioned(method, path, versionHandlers) {
    for (const [version, handler] of Object.entries(versionHandlers)) {
      this.version(version, method, path, handler);
    }
    return this;
  }
  
  // Build routes on router
  build(router) {
    for (const route of this.routes) {
      const { version, method, path, handlers } = route;
      
      // Wrap handlers with versioning support
      const wrappedHandlers = handlers.map(handler => (req, res, next) => {
        // Set version in response locals
        res.locals.version = version;
        
        // Wrap response methods
        const originalJson = res.json;
        res.json = (data) => {
          if (data && typeof data === 'object' && !data.version) {
            return originalJson.call(res, createVersionedResponse(res, data));
          }
          return originalJson.call(res, data);
        };
        
        // Wrap error handling
        try {
          handler(req, res, next);
        } catch (error) {
          createVersionedError(res, error, 500);
        }
      });
      
      router[method](`/api/${version}${path}`, ...wrappedHandlers);
    }
    
    return router;
  }
}

// Versioned Response Helpers
const VersionedResponse = {
  // Success response
  success(res, data, metadata = {}) {
    return createVersionedResponse(res, data, metadata);
  },
  
  // Error response
  error(res, error, statusCode = 500) {
    return createVersionedError(res, error, statusCode);
  },
  
  // Paginated response
  paginated(res, data, pagination, metadata = {}) {
    return createVersionedResponse(res, data, {
      ...metadata,
      pagination
    });
  },
  
  // Created response
  created(res, data, metadata = {}) {
    return createVersionedResponse(res, data, {
      ...metadata,
      status: 'created'
    });
  },
  
  // Updated response
  updated(res, data, metadata = {}) {
    return createVersionedResponse(res, data, {
      ...metadata,
      status: 'updated'
    });
  },
  
  // Deleted response
  deleted(res, data = null, metadata = {}) {
    return createVersionedResponse(res, data, {
      ...metadata,
      status: 'deleted'
    });
  }
};

// Versioned Middleware Factory
const createVersionedMiddleware = (middleware, options = {}) => {
  return (req, res, next) => {
    // Check if version supports middleware
    if (options.requiredVersion && !versionManager.isValidVersion(req.apiVersion)) {
      return createVersionedError(res, {
        message: `Middleware requires API version ${options.requiredVersion}`,
        code: 'MIDDLEWARE_VERSION_MISMATCH'
      }, 400);
    }
    
    // Check if version supports features
    if (options.requiredFeatures) {
      for (const feature of options.requiredFeatures) {
        if (!versionManager.hasFeature(req.apiVersion, feature)) {
          return createVersionedError(res, {
            message: `Feature '${feature}' is not available in API version ${req.apiVersion}`,
            code: 'FEATURE_NOT_AVAILABLE'
          }, 400);
        }
      }
    }
    
    // Wrap middleware with versioning support
    const originalNext = next;
    const wrappedNext = (error) => {
      if (error) {
        return createVersionedError(res, error, 500);
      }
      return originalNext();
    };
    
    // Set version in response locals
    res.locals.version = req.apiVersion;
    
    // Wrap response methods
    const originalJson = res.json;
    res.json = (data) => {
      if (data && typeof data === 'object' && !data.version) {
        return originalJson.call(res, createVersionedResponse(res, data));
      }
      return originalJson.call(res, data);
    };
    
    // Execute middleware
    middleware(req, res, wrappedNext);
  };
};

// Version Validation Middleware
const validateVersion = (options = {}) => {
  return (req, res, next) => {
    const { apiVersion, versionInfo } = req;
    
    // Check if version is supported
    if (!versionInfo.supported) {
      return createVersionedError(res, {
        message: `Unsupported API version: ${apiVersion}`,
        code: 'UNSUPPORTED_VERSION',
        details: {
          requestedVersion: apiVersion,
          supportedVersions: versionManager.getSupportedVersions(),
          defaultVersion: versionManager.config.defaultVersion
        }
      }, 400);
    }
    
    // Check if version is deprecated
    if (versionInfo.isDeprecated && options.rejectDeprecated) {
      return createVersionedError(res, {
        message: `API version ${apiVersion} is deprecated`,
        code: 'DEPRECATED_VERSION',
        details: {
          version: apiVersion,
          deprecationDate: versionInfo.deprecationDate,
          supportedVersions: versionManager.getSupportedVersions()
        }
      }, 400);
    }
    
    // Check if version is sunset
    if (versionInfo.isSunset) {
      return createVersionedError(res, {
        message: `API version ${apiVersion} is no longer supported`,
        code: 'SUNSET_VERSION',
        details: {
          version: apiVersion,
          sunsetDate: versionInfo.sunsetDate,
          supportedVersions: versionManager.getSupportedVersions()
        }
      }, 410);
    }
    
    next();
  };
};

// Version Feature Check Middleware
const requireFeature = (feature, options = {}) => {
  return (req, res, next) => {
    const { apiVersion, versionInfo } = req;
    
    if (!versionManager.hasFeature(apiVersion, feature)) {
      return createVersionedError(res, {
        message: `Feature '${feature}' is not available in API version ${apiVersion}`,
        code: 'FEATURE_NOT_AVAILABLE',
        details: {
          feature,
          currentVersion: apiVersion,
          availableVersions: versionManager.getSupportedVersions().filter(v => 
            versionManager.hasFeature(v, feature)
          ),
          availableFeatures: versionInfo.getAvailableFeatures()
        }
      }, 400);
    }
    
    next();
  };
};

module.exports = {
  VersionedRouter,
  VersionedRouteBuilder,
  VersionedResponse,
  createVersionedMiddleware,
  validateVersion,
  requireFeature,
  versionedRouter
};
