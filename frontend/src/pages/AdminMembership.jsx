import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, User, Image } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import api from '../utils/api';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function AdminMembership() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: pendingMembers, isLoading, refetch } = useQuery({
    queryKey: ['pendingMemberships'],
    queryFn: async () => {
      const response = await api.get('/admin/membership/pending');
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (memberId) => {
      const response = await api.post(`/admin/membership/approve/${memberId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingMemberships'] });
      alert('Membership approved!');
    },
    onError: (error) => {
      alert(`Failed: ${error.response?.data?.error || error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (memberId) => {
      const response = await api.post(`/admin/membership/reject/${memberId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingMemberships'] });
      alert('Membership rejected!');
    },
    onError: (error) => {
      alert(`Failed: ${error.response?.data?.error || error.message}`);
    },
  });

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Membership Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve seller membership payments
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Membership Requests ({pendingMembers?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : pendingMembers?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending membership requests
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMembers?.map((member) => (
                  <div
                    key={member._id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        {member.businessName && (
                          <p className="text-sm text-muted-foreground">
                            Business: {member.businessName}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted: {new Date(member.paymentSubmittedAt).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {member.paymentProof && (
                        <a
                          href={member.paymentProof}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Image className="h-4 w-4" />
                          View Payment Proof
                        </a>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectMutation.mutate(member._id)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(member._id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default AdminMembership;
