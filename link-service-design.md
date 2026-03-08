# Generic Link Shortening & Deep Linking Service Design

## Overview

This document outlines the design for a scalable, generic URL shortening and deep linking service that can serve multiple applications and payload types. The service is designed to start simple and scale to handle massive loads while maintaining performance and cost-effectiveness.

## Table of Contents

1. [Service Architecture](#service-architecture)
2. [API Design](#api-design)
3. [Database Design & Scaling Strategy](#database-design--scaling-strategy)
4. [Implementation Phases](#implementation-phases)
5. [Security & Performance](#security--performance)
6. [Deployment & Infrastructure](#deployment--infrastructure)

## Service Architecture

### Core Principles

- **Generic Design**: Support any payload type (workouts, recipes, articles, etc.)
- **Multi-App Support**: Serve multiple applications with isolated configurations
- **Scalable**: Handle growth from thousands to billions of links
- **Cost-Effective**: Optimize costs at each scale tier
- **Analytics-Rich**: Comprehensive tracking and insights

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile Apps   │    │   Web Clients   │    │  Third-Party    │
│                 │    │                 │    │  Integrations   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Load Balancer       │
                    │    (CloudFlare/AWS)      │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │       API Gateway        │
                    │   (Rate Limiting, Auth)  │
                    └─────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌─────────▼─────────┐
│   Link Service    │  │  Analytics API    │  │   Admin API       │
│   (Create/Read)   │  │  (Reporting)      │  │  (App Management) │
└─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      Cache Layer         │
                    │    (Redis Cluster)       │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     Database Layer       │
                    │  (PostgreSQL → Hybrid)   │
                    └─────────────────────────────┘
```

## API Design

### 1. Core Endpoints

#### Create Short Link
```http
POST /api/links
Content-Type: application/json
X-API-Key: {app_api_key}

{
  "payload": {}, // Any JSON payload
  "appId": "proworkout",
  "payloadType": "workout",
  "metadata": {
    "title": "My Strength Workout",
    "description": "Full body workout with 5 exercises",
    "imageUrl": "https://example.com/image.jpg",
    "tags": ["strength", "beginner"],
    "createdBy": "user123",
    "expiresInDays": 30,
    "customDomain": "share.myapp.com"
  },
  "options": {
    "customCode": "my-workout",
    "trackingEnabled": true,
    "requireAuth": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shortCode": "abc123",
    "shortUrl": "https://go.fit/abc123",
    "deepLink": "proworkout://workout/abc123",
    "qrCodeUrl": "https://go.fit/abc123/qr",
    "webViewUrl": "https://go.fit/abc123/preview",
    "analyticsUrl": "https://go.fit/abc123/analytics",
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

#### Retrieve Link Data
```http
GET /api/links/{shortCode}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payload": {}, // Original payload
    "appId": "proworkout",
    "payloadType": "workout",
    "metadata": {
      "title": "My Strength Workout",
      "description": "Full body workout with 5 exercises",
      "tags": ["strength", "beginner"],
      "createdBy": "user123",
      "createdAt": "2024-01-15T10:30:00Z",
      "viewCount": 42,
      "isExpired": false
    },
    "appConfig": {
      "name": "ProWorkout Builder",
      "scheme": "proworkout",
      "storeUrls": {
        "ios": "https://apps.apple.com/app/id6747937070",
        "android": "https://play.google.com/store/apps/details?id=com.dorapockettech.goexercise"
      },
      "branding": {
        "logo": "https://proworkout.app/logo.png",
        "primaryColor": "#f43f5e"
      }
    }
  }
}
```

#### Analytics API
```http
GET /api/analytics/{shortCode}
X-API-Key: {app_api_key}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalViews": 1250,
    "uniqueViews": 890,
    "platformBreakdown": {
      "ios": 450,
      "android": 380,
      "web": 420
    },
    "timeSeriesData": [
      {"date": "2024-01-15", "views": 45},
      {"date": "2024-01-16", "views": 67}
    ],
    "topReferrers": [
      {"domain": "twitter.com", "count": 234},
      {"domain": "instagram.com", "count": 156}
    ],
    "geographicData": [
      {"country": "US", "count": 567},
      {"country": "CA", "count": 123}
    ]
  }
}
```

### 2. Utility Endpoints

#### QR Code Generation
```http
GET /api/qr/{shortCode}?size=512&format=png&margin=2
```
Returns PNG image buffer.

#### Web Preview
```http
GET /api/preview/{shortCode}
```
Returns HTML page with content preview and app download links.

#### Bulk Operations
```http
POST /api/links/bulk
X-API-Key: {app_api_key}

{
  "links": [
    {
      "payload": {},
      "payloadType": "workout",
      "metadata": {}
    }
  ]
}
```

## Database Design & Scaling Strategy

### Database Choice Decision Matrix

| Factor | PostgreSQL | DynamoDB | MongoDB | Winner |
|--------|------------|----------|---------|---------|
| **ACID Compliance** | ✅ Strong | ❌ Eventual | ⚠️ Configurable | PostgreSQL |
| **Complex Queries** | ✅ Excellent | ❌ Limited | ⚠️ Good | PostgreSQL |
| **Horizontal Scale** | ⚠️ Complex | ✅ Automatic | ✅ Good | DynamoDB |
| **Cost (Small Scale)** | ✅ Low | ❌ High | ⚠️ Medium | PostgreSQL |
| **JSON Support** | ✅ Native JSONB | ✅ Native | ✅ Native | Tie |
| **Operational Complexity** | ⚠️ Medium | ✅ Low | ⚠️ Medium | DynamoDB |
| **Analytics Queries** | ✅ Excellent | ❌ Poor | ⚠️ Good | PostgreSQL |

### 🎯 **Recommendation: Start with SQL, Plan for Hybrid**

For your use case, I recommend **starting with SQL (PostgreSQL)** and evolving to a **hybrid approach** as you scale.

### Recommended Evolution Strategy

#### Phase 1: Pure SQL (0-10M links/month)
**Timeline:** Months 1-12  
**Cost:** $50-200/month  
**Architecture:** Single PostgreSQL with read replicas

**Why PostgreSQL First:**
1. **Your analytics requirements** are complex and SQL excels here
2. **Relational data model** fits your app configs and link relationships  
3. **Faster development** with familiar tools and better debugging
4. **Cost-effective** until you reach massive scale
5. **Easy migration path** to hybrid when needed

#### Phase 2: SQL + Cache (10M-100M links/month)
**Timeline:** Months 12-18  
**Cost:** $200-1,000/month  
**Architecture:** PostgreSQL cluster + Redis cluster

#### Phase 3: Hybrid Architecture (100M+ links/month)
**Timeline:** Months 18+  
**Cost:** $1,000+/month  
**Architecture:** Multi-database approach optimized by access pattern

```typescript
// Split by access pattern
const hybridArchitecture = {
  // Hot path: Link resolution (99% of traffic)
  linkResolution: {
    database: 'DynamoDB',
    cache: 'ElastiCache Redis Cluster',
    pattern: 'Read-heavy, simple queries',
  },
  
  // Analytics path: Complex queries
  analytics: {
    database: 'PostgreSQL + TimescaleDB',
    warehouse: 'ClickHouse or BigQuery',
    pattern: 'Complex aggregations',
  },
  
  // Admin path: App management
  administration: {
    database: 'PostgreSQL',
    pattern: 'CRUD operations, low volume',
  },
};
```

### Performance Benchmarks by Phase

| Metric | Phase 1 (SQL) | Phase 2 (SQL+Cache) | Phase 3 (Hybrid) |
|--------|---------------|---------------------|-------------------|
| **Links/Month** | 1M-10M | 10M-100M | 100M+ |
| **Read Latency** | 5-15ms | 1-5ms | <1ms |
| **Write Latency** | 10-30ms | 10-30ms | 5-15ms |
| **Throughput** | 1K RPS | 10K RPS | 100K+ RPS |
| **Availability** | 99.9% | 99.95% | 99.99% |
| **Cost/Month** | $50-200 | $200-1K | $1K+ |
| **Complexity** | Low | Medium | High |

## Phase 1: PostgreSQL Schema Design

### Optimized Database Schema
```sql
-- Apps Configuration Table
CREATE TABLE apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  deep_link_scheme VARCHAR(50) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  store_urls JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partitioned links table for better performance
CREATE TABLE shared_links (
  id UUID DEFAULT gen_random_uuid(),
  short_code VARCHAR(10) NOT NULL,
  app_id VARCHAR(50) REFERENCES apps(app_id),
  payload_type VARCHAR(50) NOT NULL,
  payload_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  options JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  unique_view_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,

  PRIMARY KEY (short_code, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE shared_links_2024_01 PARTITION OF shared_links
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Optimized indexes
CREATE INDEX CONCURRENTLY idx_short_code_active
ON shared_links (short_code) WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_app_payload_type
ON shared_links (app_id, payload_type, created_at);

CREATE INDEX CONCURRENTLY idx_expires_at
ON shared_links (expires_at) WHERE expires_at IS NOT NULL;

-- Separate analytics table (time-series optimized)
CREATE TABLE link_analytics (
  id BIGSERIAL,
  short_code VARCHAR(10) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  session_id VARCHAR(100),
  user_agent TEXT,
  ip_address INET,
  referrer TEXT,
  platform VARCHAR(20),
  country VARCHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Daily partitions for analytics
CREATE TABLE link_analytics_2024_01_01 PARTITION OF link_analytics
FOR VALUES FROM ('2024-01-01') TO ('2024-01-02');

-- Analytics indexes
CREATE INDEX CONCURRENTLY idx_analytics_short_code_time
ON link_analytics (short_code, created_at);

CREATE INDEX CONCURRENTLY idx_analytics_event_type
ON link_analytics (event_type, created_at);

-- Custom Domains Table (for white-label)
CREATE TABLE custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id VARCHAR(50) REFERENCES apps(app_id),
  domain VARCHAR(255) UNIQUE NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  ssl_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Performance Characteristics:**
- Read Latency: 5-15ms
- Write Latency: 10-30ms
- Throughput: 1,000 RPS
- Storage: Up to 1TB efficiently

## Implementation Phases

### Phase 1: Foundation (Months 1-3)
**Goal:** Launch MVP with core functionality

**Deliverables:**
- [ ] Basic API endpoints (create, retrieve, analytics)
- [ ] PostgreSQL database with optimized schema
- [ ] App registration and API key management
- [ ] Basic caching with Redis
- [ ] QR code generation
- [ ] Web preview pages
- [ ] Rate limiting and security
- [ ] Basic monitoring and logging

**Tech Stack:**
- **Backend:** Node.js/TypeScript with Next.js API routes
- **Database:** PostgreSQL (Supabase or AWS RDS)
- **Cache:** Redis (Upstash or AWS ElastiCache)
- **Hosting:** Vercel or AWS Lambda
- **CDN:** CloudFlare
- **Monitoring:** Sentry + PostHog

### Phase 2: Scale & Polish (Months 4-6)
**Goal:** Handle production load and add advanced features

**Deliverables:**
- [ ] Read replica setup
- [ ] Advanced analytics dashboard
- [ ] Bulk operations API
- [ ] Custom domain support
- [ ] A/B testing for link performance
- [ ] Advanced security (API key rotation, IP whitelisting)
- [ ] Comprehensive documentation
- [ ] SDK for popular languages

### Phase 3: Enterprise Features (Months 7-12)
**Goal:** Support enterprise customers and massive scale

**Deliverables:**
- [ ] White-label solutions
- [ ] Advanced analytics with custom reports
- [ ] Webhook support for real-time events
- [ ] Multi-region deployment
- [ ] Enterprise SLA guarantees
- [ ] Advanced security compliance (SOC2, GDPR)

## Security & Performance

### Security Measures

#### Authentication & Authorization
```typescript
// API Key Management
interface ApiKeyConfig {
  keyId: string;
  appId: string;
  keyHash: string; // bcrypt hashed
  permissions: string[]; // ['create', 'read', 'analytics']
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  ipWhitelist?: string[];
  expiresAt?: Date;
  isActive: boolean;
}

// Rate Limiting Strategy
const rateLimitConfig = {
  global: '1000 requests/minute',
  perApiKey: '100 requests/minute',
  perIP: '10 requests/minute (unauthenticated)',
  burstAllowance: '10x normal rate for 1 minute',

  // Different limits by endpoint
  endpoints: {
    'POST /api/links': '50/minute',
    'GET /api/links/:code': '500/minute',
    'GET /api/analytics/:code': '20/minute',
  },
};
```

### Performance Optimizations

#### Caching Strategy
```typescript
// Multi-layer Caching
const cachingStrategy = {
  // L1: Application cache (in-memory)
  l1: {
    type: 'LRU Cache',
    size: '100MB',
    ttl: '5 minutes',
    items: ['Hot app configs', 'Recent short codes'],
  },

  // L2: Redis cache
  l2: {
    type: 'Redis Cluster',
    size: '10GB',
    ttl: 'Variable (1 hour - 1 week)',
    items: ['Link data', 'Analytics', 'QR codes'],
  },

  // L3: CDN cache
  l3: {
    type: 'CloudFlare',
    size: 'Unlimited',
    ttl: '1 week - 1 month',
    items: ['Static assets', 'QR codes', 'Preview pages'],
  },
};
```

## Service Implementation Examples

### Generic Link Service
```typescript
// services/universal-link-service.ts
interface UniversalLinkService {
  createLink(request: CreateLinkRequest): Promise<CreateLinkResponse>;
  getLink(shortCode: string): Promise<RetrieveLinkResponse>;
  getAnalytics(shortCode: string, apiKey: string): Promise<AnalyticsResponse>;
}

class LinkService implements UniversalLinkService {
  private readonly baseUrl: string;
  private readonly apiUrl: string;

  constructor(baseUrl: string = 'https://go.fit', apiUrl: string = 'https://api.go.fit') {
    this.baseUrl = baseUrl;
    this.apiUrl = apiUrl;
  }

  async createLink(request: CreateLinkRequest): Promise<CreateLinkResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.getApiKey(request.appId),
          'User-Agent': this.getUserAgent(request.appId),
        },
        body: JSON.stringify(request),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create link');
      }

      return result;
    } catch (error) {
      return {
        success: false,
        data: {} as any,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getLink(shortCode: string): Promise<RetrieveLinkResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/links/${shortCode}`);
      const result = await response.json();

      return result;
    } catch (error) {
      return {
        success: false,
        data: {} as any,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getApiKey(appId: string): string {
    // In production, this would come from secure storage or environment
    const apiKeys: Record<string, string> = {
      'proworkout': process.env.PROWORKOUT_API_KEY || '',
      'myrecipes': process.env.MYRECIPES_API_KEY || '',
      // Add more apps as needed
    };
    return apiKeys[appId] || '';
  }

  private getUserAgent(appId: string): string {
    return `${appId}/${Platform.OS}/${Platform.Version}`;
  }
}

export const linkService = new LinkService();
```

### App-Specific Workout Service
```typescript
// services/workout-share-service.ts (ProWorkout Builder specific)
import { linkService } from './universal-link-service';

interface WorkoutShareService {
  shareWorkout(workout: WorkoutPlan, options?: ShareOptions): Promise<ShareResult>;
  getSharedWorkout(shortCode: string): Promise<WorkoutPlan | null>;
}

class ProWorkoutShareService implements WorkoutShareService {
  private readonly appId = 'proworkout';

  async shareWorkout(workout: WorkoutPlan, options: ShareOptions = {}): Promise<ShareResult> {
    const request: CreateLinkRequest = {
      appId: this.appId,
      payloadType: 'workout',
      payload: workout,
      metadata: {
        title: workout.name,
        description: workout.description || `Workout with ${workout.exercises.length} exercises`,
        tags: options.tags,
        createdBy: options.createdBy,
        expiresInDays: options.expiresInDays || 30,
      },
      options: {
        trackingEnabled: true,
        requireAuth: false,
      },
    };

    const result = await linkService.createLink(request);

    if (!result.success) {
      return {
        shortUrl: '',
        deepLink: '',
        qrCodeUrl: '',
        webViewUrl: '',
        success: false,
        error: result.error,
      };
    }

    return {
      shortUrl: result.data.shortUrl,
      deepLink: result.data.deepLink,
      qrCodeUrl: result.data.qrCodeUrl,
      webViewUrl: result.data.webViewUrl,
      success: true,
    };
  }

  async getSharedWorkout(shortCode: string): Promise<WorkoutPlan | null> {
    try {
      const result = await linkService.getLink(shortCode);

      if (!result.success || result.data.payloadType !== 'workout') {
        return null;
      }

      return result.data.payload as WorkoutPlan;
    } catch (error) {
      console.error('Error fetching shared workout:', error);
      return null;
    }
  }
}

export const workoutShareService = new ProWorkoutShareService();
```

## Cost Analysis

### Phase 1 Costs (Monthly)
```
Infrastructure:
- Vercel Pro: $20
- Supabase Pro: $25
- Upstash Redis: $10
- CloudFlare Pro: $20
- Monitoring (Sentry): $26
- Domain & SSL: $2
Total: ~$103/month

At 1M links/month:
- Cost per link: $0.0001
- Cost per 1K views: $0.10
```

### Phase 2 Costs (Monthly)
```
Infrastructure:
- AWS ECS (2 instances): $60
- RDS PostgreSQL (db.t3.medium): $85
- ElastiCache (cache.t3.small): $45
- CloudFront CDN: $30
- Load Balancer: $25
- Monitoring & Logging: $50
- Data Transfer: $40
Total: ~$335/month

At 50M links/month:
- Cost per link: $0.0000067
- Cost per 1K views: $0.067
```

### Phase 3 Costs (Monthly)
```
Infrastructure:
- AWS ECS (Auto-scaling): $200
- RDS PostgreSQL (Multi-AZ): $400
- DynamoDB (On-demand): $300
- ElastiCache Cluster: $150
- CloudFront (Global): $100
- Data Transfer: $200
- Monitoring & Analytics: $100
Total: ~$1,450/month

At 500M links/month:
- Cost per link: $0.0000029
- Cost per 1K views: $0.029
```

## Conclusion

This design provides a robust, scalable foundation for a generic link shortening service that can:

1. **Start Simple**: Launch quickly with PostgreSQL and basic caching
2. **Scale Efficiently**: Evolve architecture based on actual usage patterns
3. **Support Multiple Apps**: Generic design accommodates any payload type
4. **Optimize Costs**: Pay only for what you need at each scale tier
5. **Maintain Performance**: Sub-second response times even at massive scale

The phased approach ensures you can validate the business model and user demand before investing in complex infrastructure, while the technical design provides a clear path to handle billions of links if needed.

### Next Steps

1. **Week 1-2**: Set up development environment and basic API
2. **Week 3-4**: Implement core functionality and database schema
3. **Month 2**: Add caching, analytics, and security features
4. **Month 3**: Launch MVP with ProWorkout Builder integration
5. **Month 4-6**: Optimize based on real usage patterns
6. **Month 6+**: Plan Phase 2 scaling based on growth metrics

The service is designed to grow with your business while maintaining excellent performance and reasonable costs at every stage.
