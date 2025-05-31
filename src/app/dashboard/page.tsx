"use client";

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { observeAuthState } from '@/services/auth-service';
import { User } from 'firebase/auth';
import { SidebarNavigation } from '@/components/navigation/sidebar';
interface FlowTrackingData {
  flowId?: string;
  status?: string;
  owner?: string;
  timestamp?: number;
  startAt?: number;
  step?: number;
  details?: any;
}

const DashboardPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [flowData, setFlowData] = useState<FlowTrackingData[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsubscribe = observeAuthState(user => {
      setUser(user);
    });
    const fetchFlowData = async () => {
      if (user?.email) {
        try {
          const q = query(collection(db, 'flowTracking'), where('owner', '==', user?.email));
          const querySnapshot = await getDocs(q);
          const data = querySnapshot.docs.map(doc => doc.data() as FlowTrackingData);
          console.log(data);
          setFlowData(data);
        } catch (error) {
          console.error('Error fetching flow tracking data:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchFlowData();
    return () => unsubscribe();
  }, [user]);

  return (
    <div style={{ display: 'flex' }}>
      <SidebarNavigation />
      <div style={{ flexGrow: 1, padding: '20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Xin chào {user?.email}!</h1>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Bảng điều khiển theo dõi luồng</h1>

        {loading ? (
          <p>Loading flow data...</p>
        ) : flowData.length > 0 ? (
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {flowData.map((flow, index) => (
              <li
                key={index}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ marginBottom: '8px' }}>
                  <strong>Flow ID:</strong> {flow.flowId ?? '(no id)'}<br />
                  <strong>Status:</strong> {flow.status}<br />
                  <strong>Start At:</strong>{' '}
                  {flow.startAt
                    ? new Date(flow.startAt).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    })
                    : 'N/A'}<br />
                </div>

                {/* Progress Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '12px' }}>
                  {[0, 1, 2, 3].map((stepNum) => (
                    <div
                      key={stepNum}
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor:
                          (flow?.step ?? 0) >= stepNum ? '#4F46E5' : '#E5E7EB',
                        marginRight: '8px',
                        transition: 'background-color 0.3s',
                      }}
                    ></div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No flow tracking data found for this user.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;