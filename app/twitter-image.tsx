import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Heavy Metal Stats - Free Precious Metal Statistics & COMEX Inventory Data';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #d97706)',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              backgroundColor: '#fbbf24',
              marginBottom: '30px',
              fontSize: '40px',
              fontWeight: 'bold',
              color: '#0f172a',
            }}
          >
            Au
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '52px',
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: '20px',
              letterSpacing: '-2px',
            }}
          >
            Heavy Metal Stats
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '26px',
              color: '#94a3b8',
              textAlign: 'center',
              marginBottom: '40px',
            }}
          >
            Free Precious Metal Statistics & COMEX Inventory Data
          </div>

          {/* Date badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderRadius: '100px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
              }}
            />
            <div
              style={{
                fontSize: '18px',
                color: '#10b981',
                fontWeight: 'bold',
              }}
            >
              Updated Daily from CME Group
            </div>
          </div>
        </div>

        {/* URL at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            fontSize: '20px',
            color: '#64748b',
          }}
        >
          heavymetalstats.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
