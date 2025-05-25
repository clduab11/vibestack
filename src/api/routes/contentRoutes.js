// src/api/routes/contentRoutes.js

/**
 * ContentRoutes: Handles content creation, retrieval, and feed endpoints.
 * Extracted from apiRoutes.js for modularity and maintainability.
 * All dependencies are injected for testability.
 */

class ContentRoutes {
  constructor({ contentService, validationService, securityMiddleware, loggerService }) {
    if (!contentService || !validationService || !securityMiddleware || !loggerService) {
      throw new Error('Required dependencies missing for ContentRoutes');
    }
    this.contentService = contentService;
    this.validationService = validationService;
    this.securityMiddleware = securityMiddleware;
    this.loggerService = loggerService;
  }

  createContent() {
    return async (req, res, next) => {
      try {
        this.loggerService.logAPIRequest?.(req);
        const result = this.validationService.validateContentCreation(req.body);
        if (!result.isValid) {
          return res.status(400).json({
            error: 'Validation failed',
            message: 'Content data is invalid',
            details: result.errors
          });
        }
        const contentData = { ...result.sanitizedData, authorId: req.user?.userId };
        const createResult = await this.contentService.createContent(contentData);
        if (createResult.success) {
          res.status(201).json({
            success: true,
            message: 'Content created successfully',
            data: createResult.content
          });
        } else {
          res.status(400).json({
            error: 'Content creation failed',
            message: createResult.error
          });
        }
      } catch (err) {
        next(err);
      }
    };
  }

  getContent() {
    return async (req, res, next) => {
      try {
        const contentId = req.params.id;
        const result = await this.contentService.getContentById(contentId);
        if (result.success) {
          res.status(200).json({
            success: true,
            data: result.content
          });
        } else {
          res.status(404).json({
            error: 'Not found',
            message: result.error
          });
        }
      } catch (err) {
        next(err);
      }
    };
  }

  getFeed() {
    return async (req, res, next) => {
      try {
        const userId = req.user?.userId;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const result = await this.contentService.getUserFeed(userId, { page, limit });
        if (result.success) {
          res.status(200).json({
            success: true,
            data: result.feed
          });
        } else {
          res.status(400).json({
            error: 'Feed retrieval failed',
            message: result.error
          });
        }
      } catch (err) {
        next(err);
      }
    };
  }
}

module.exports = {
  ContentRoutes
};