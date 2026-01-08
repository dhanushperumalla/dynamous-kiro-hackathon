import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '@/utils/logger';

// Validation error response interface
interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: Array<{
      field: string;
      message: string;
      value?: any;
    }>;
    timestamp: string;
    requestId: string;
  };
}

// Validation options
interface ValidationOptions {
  abortEarly?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
}

// Default validation options
const defaultOptions: ValidationOptions = {
  abortEarly: false, // Return all validation errors, not just the first one
  allowUnknown: false, // Don't allow unknown fields
  stripUnknown: true // Remove unknown fields from the validated data
};

/**
 * Generic validation middleware factory
 * @param schema - Joi validation schema
 * @param property - Request property to validate ('body', 'query', 'params')
 * @param options - Validation options
 */
export const validate = (
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body',
  options: ValidationOptions = {}
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationOptions = { ...defaultOptions, ...options };
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    // Get the data to validate
    const dataToValidate = req[property];
    
    // Perform validation
    const { error, value } = schema.validate(dataToValidate, validationOptions);
    
    if (error) {
      // Format validation errors
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      // Log validation error
      logger.warn('Validation error', {
        requestId,
        property,
        errors: validationErrors,
        originalData: dataToValidate,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      
      // Send error response
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validationErrors,
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }
    
    // Replace the original data with validated and sanitized data
    req[property] = value;
    
    // Log successful validation in debug mode
    logger.debug('Validation successful', {
      requestId,
      property,
      validatedFields: Object.keys(value || {})
    });
    
    next();
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: Joi.ObjectSchema, options?: ValidationOptions) => {
  return validate(schema, 'body', options);
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema, options?: ValidationOptions) => {
  return validate(schema, 'query', options);
};

/**
 * Validate route parameters
 */
export const validateParams = (schema: Joi.ObjectSchema, options?: ValidationOptions) => {
  return validate(schema, 'params', options);
};

/**
 * Validate multiple request properties
 */
export const validateMultiple = (validations: Array<{
  schema: Joi.ObjectSchema;
  property: 'body' | 'query' | 'params';
  options?: ValidationOptions;
}>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    const allErrors: Array<{
      property: string;
      field: string;
      message: string;
      value?: any;
    }> = [];
    
    // Validate each property
    for (const validation of validations) {
      const { schema, property, options: validationOptions = {} } = validation;
      const mergedOptions = { ...defaultOptions, ...validationOptions };
      const dataToValidate = req[property];
      
      const { error, value } = schema.validate(dataToValidate, mergedOptions);
      
      if (error) {
        // Collect errors from this validation
        const propertyErrors = error.details.map(detail => ({
          property,
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        
        allErrors.push(...propertyErrors);
      } else {
        // Update request with validated data
        req[property] = value;
      }
    }
    
    // If there are any errors, return them all
    if (allErrors.length > 0) {
      logger.warn('Multiple validation errors', {
        requestId,
        errors: allErrors,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: allErrors.map(err => ({
            field: `${err.property}.${err.field}`,
            message: err.message,
            value: err.value
          })),
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }
    
    logger.debug('Multiple validations successful', {
      requestId,
      validatedProperties: validations.map(v => v.property)
    });
    
    next();
  };
};

/**
 * Conditional validation middleware
 * Only validates if a condition is met
 */
export const validateIf = (
  condition: (req: Request) => boolean,
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body',
  options?: ValidationOptions
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (condition(req)) {
      return validate(schema, property, options)(req, res, next);
    }
    next();
  };
};

/**
 * Sanitize request data middleware
 * Removes potentially dangerous content
 */
export const sanitizeRequest = (properties: Array<'body' | 'query' | 'params'> = ['body']) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    
    for (const property of properties) {
      const data = req[property];
      if (data && typeof data === 'object') {
        req[property] = sanitizeObject(data);
      }
    }
    
    logger.debug('Request sanitized', {
      requestId,
      sanitizedProperties: properties
    });
    
    next();
  };
};

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return obj
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }
  
  return obj;
}

/**
 * File upload validation middleware
 */
export const validateFileUpload = (options: {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  maxFiles?: number;
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'],
      maxFiles = 1,
      required = false
    } = options;
    
    const requestId = req.headers['x-request-id'] as string || 'unknown';
    const files = (req as any).files as any[] | undefined;
    
    // Check if files are required
    if (required && (!files || files.length === 0)) {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File upload is required',
          details: [{
            field: 'files',
            message: 'At least one file must be uploaded'
          }],
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }
    
    // If no files and not required, continue
    if (!files || files.length === 0) {
      next();
      return;
    }
    
    const errors: Array<{ field: string; message: string }> = [];
    
    // Check number of files
    if (files.length > maxFiles) {
      errors.push({
        field: 'files',
        message: `Maximum ${maxFiles} file(s) allowed, received ${files.length}`
      });
    }
    
    // Validate each file
    files.forEach((file: any, index: number) => {
      // Check file size
      if (file.size > maxSize) {
        errors.push({
          field: `files[${index}]`,
          message: `File size ${file.size} bytes exceeds maximum allowed size of ${maxSize} bytes`
        });
      }
      
      // Check MIME type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        errors.push({
          field: `files[${index}]`,
          message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`
        });
      }
    });
    
    if (errors.length > 0) {
      logger.warn('File upload validation failed', {
        requestId,
        errors,
        fileCount: files.length,
        fileSizes: files.map((f: any) => f.size),
        mimeTypes: files.map((f: any) => f.mimetype)
      });
      
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File upload validation failed',
          details: errors,
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }
    
    logger.debug('File upload validation successful', {
      requestId,
      fileCount: files.length,
      totalSize: files.reduce((sum: number, f: any) => sum + f.size, 0)
    });
    
    next();
  };
};