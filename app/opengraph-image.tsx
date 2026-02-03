import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'COMEX Metals Inventory Tracker - Live Gold & Silver Data';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

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
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: '20px',
              letterSpacing: '-2px',
            }}
          >
            COMEX Metals Inventory
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '28px',
              color: '#94a3b8',
              textAlign: 'center',
              marginBottom: '40px',
            }}
          >
            Live Gold & Silver Warehouse Stock Data
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '60px',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  color: '#fbbf24',
                  fontWeight: 'bold',
                }}
              >
                GOLD
              </div>
              <div
                style={{
                  fontSize: '18px',
                  color: '#64748b',
                }}
              >
                Registered Stock
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  color: '#94a3b8',
                  fontWeight: 'bold',
                }}
              >
                SILVER
              </div>
              <div
                style={{
                  fontSize: '18px',
                  color: '#64748b',
                }}
              >
                Registered Stock
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  color: '#b45309',
                  fontWeight: 'bold',
                }}
              >
                COPPER
              </div>
              <div
                style={{
                  fontSize: '18px',
                  color: '#64748b',
                }}
              >
                Registered Stock
              </div>
            </div>
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
              Updated Daily • CME Group Data
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
