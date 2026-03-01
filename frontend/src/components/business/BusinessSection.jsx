import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, Mail, Phone, MapPin, Edit, Camera, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/utils/api';

export default function BusinessSection() {
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const [form, setForm] = useState({
        name: '',
        description: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
    });

    useEffect(() => {
        fetchBusiness();
    }, []);

    const fetchBusiness = async () => {
        try {
            const response = await api.get('/business/my');
            setBusiness(response.data.business);
            if (response.data.business) {
                setForm({
                    name: response.data.business.name || '',
                    description: response.data.business.description || '',
                    email: response.data.business.email || '',
                    phone: response.data.business.phone || '',
                    address: response.data.business.address || '',
                    city: response.data.business.city || '',
                    state: response.data.business.state || '',
                });
            }
        } catch (error) {
            console.error('Failed to fetch business:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBusiness = async () => {
        if (!form.name || !form.email || !form.phone) {
            toast({
                title: 'Error',
                description: 'Please fill in all required fields',
                variant: 'destructive',
            });
            return;
        }

        setSaving(true);
        try {
            const response = await api.post('/business', form);
            setBusiness(response.data.business);
            setEditing(false);
            toast({
                title: 'Success',
                description: 'Business registered successfully!',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to create business',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateBusiness = async () => {
        if (!business?._id) return;
        setSaving(true);
        try {
            await api.put(`/business/${business._id}`, form);
            await fetchBusiness();
            setEditing(false);
            toast({
                title: 'Success',
                description: 'Business updated successfully!',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update business',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result;

                // Upload image
                const uploadResponse = await api.post('/product-images/process', {
                    image: base64,
                });

                const logoUrl = uploadResponse.data.url;

                // Update business logo
                await api.put('/business/logo', { logoUrl });
                await fetchBusiness();

                toast({
                    title: 'Success',
                    description: 'Logo updated successfully!',
                });
            };
            reader.readAsDataURL(file);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to upload logo',
                variant: 'destructive',
            });
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // No business registered
    if (!business && !editing) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5" />
                        Business Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        Register your business to access logo generation, showcase your brand,
                        and unlock verified seller status.
                    </p>
                    <Button onClick={() => setEditing(true)} className="w-full">
                        <Store className="h-4 w-4 mr-2" />
                        Register Business
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Editing/Creating
    if (editing || !business) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{business ? 'Edit Business' : 'Register Business'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Business Name *</Label>
                        <Input
                            id="name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Enter business name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Describe your business"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="business@email.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone *</Label>
                            <Input
                                id="phone"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="08123456789"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                            id="address"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                            placeholder="Business address"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                                placeholder="City"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Input
                                id="state"
                                value={form.state}
                                onChange={(e) => setForm({ ...form, state: e.target.value })}
                                placeholder="State"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setEditing(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={business ? handleUpdateBusiness : handleCreateBusiness}
                            disabled={saving}
                            className="flex-1"
                        >
                            {saving ? 'Saving...' : business ? 'Save Changes' : 'Register'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // View business
    return (
        <Card>
            <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {/* Logo */}
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-border">
                                {business.logoInfo?.url ? (
                                    <img
                                        src={business.logoInfo.url}
                                        alt={business.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-2xl font-bold text-primary">
                                        {(business.name || 'B').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            {business.isVerified && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                                    <CheckCircle className="h-4 w-4 text-white" />
                                </div>
                            )}
                        </div>

                        <div>
                            <CardTitle className="text-xl">{business.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant={business.isVerified ? 'default' : 'secondary'}>
                                    {business.isVerified ? 'Verified' : 'Pending Verification'}
                                </Badge>
                                <Badge variant="outline">{business.businessType}</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Button variant="outline" size="sm">
                                <Camera className="h-4 w-4 mr-2" />
                                Change Logo
                            </Button>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
                {business.description && (
                    <p className="text-muted-foreground">{business.description}</p>
                )}

                <div className="grid gap-3">
                    <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{business.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{business.phone}</span>
                    </div>
                    {business.address && (
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{business.address}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}