import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Upload,
    Plus,
    X,
    Store,
    TrendingUp,
    Users,
    Shield,
    ArrowRight,
    Sparkles,
    Zap,
    Award,
    Crown,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

const categories = [
    "Food & Beverages",
    "Handicrafts",
    "Fashion & Apparel",
    "Health & Beauty",
    "Home & Living",
    "Electronics",
    "Services",
    "Other",
];

const Sell = () => {
    const [images, setImages] = useState([]);
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");
    const { t } = useTranslation();

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter((tag) => tag !== tagToRemove));
    };

    return (
        <>
            <div className="container py-8">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <Badge variant="secondary" className="mb-4">
                        {t('sell.benefitsTitle') || 'Start Your Business Journey'}
                    </Badge>
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">
                        {t('sell.title') || 'Sell Your Products on MSMEHub'}
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        {t('sell.subtitle') || 'Join thousands of MSMEs already growing their business. List your products, reach local customers, and build your brand.'}
                    </p>
                </div>

                {/* Benefits */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    {[
                        {
                            icon: Users,
                            title: t('sell.benefit1Title') || "50,000+ Buyers",
                            description: t('sell.benefit1Desc') || "Access to active local customers",
                        },
                        {
                            icon: TrendingUp,
                            title: t('sell.benefit2Title') || "Grow Sales",
                            description: t('sell.benefit2Desc') || "Average 3x increase in reach",
                        },
                        {
                            icon: Shield,
                            title: t('sell.benefit3Title') || "Secure Platform",
                            description: t('sell.benefit3Desc') || "Protected transactions",
                        },
                        {
                            icon: Store,
                            title: t('sell.benefit4Title') || "Free to Start",
                            description: t('sell.benefit4Desc') || "No listing fees for basic plan",
                        },
                        {
                            icon: Sparkles,
                            title: t('sell.benefit5Title') || "AI Logo Generator",
                            description: t('sell.benefit5Desc') || "Create professional logos for your brand",
                            premium: true,
                        },
                        {
                            icon: Zap,
                            title: t('sell.benefit6Title') || "Automation Tools",
                            description: t('sell.benefit6Desc') || "Streamline order confirmations & alerts",
                            premium: true,
                        },
                    ].map((benefit) => (
                        <Card key={benefit.title} className="text-center">
                            <CardContent className="pt-6">
                                <div className="relative inline-block">
                                    <benefit.icon className={`h-8 w-8 mx-auto mb-2 ${benefit.premium ? 'text-yellow-500' : 'text-primary'}`} />
                                    {benefit.premium && (
                                        <Crown className="h-4 w-4 absolute -top-1 -right-3 text-yellow-500" />
                                    )}
                                </div>
                                <h3 className="font-semibold">{benefit.title}</h3>
                                <p className="text-sm text-muted-foreground">{benefit.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Premium Membership Call-to-Action */}
                <Card className="mb-12 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800">
                    <CardContent className="pt-6 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="bg-yellow-100 dark:bg-yellow-900/40 p-3 rounded-full">
                                <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">
                            {t('membership.title') || 'Unlock Premium Features'}
                        </h3>
                        <p className="text-muted-foreground mb-4 max-w-lg mx-auto">
                            {t('membership.subtitle') || 'Get exclusive access to AI Logo Generator and Workflow Automation'}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 mb-4">
                            <Badge variant="secondary" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                {t('membership.benefit1Title') || 'AI Logo Generator'}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                                <Zap className="h-3 w-3" />
                                {t('membership.benefit2Title') || 'Workflow Automation'}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                                <Award className="h-3 w-3" />
                                {t('membership.benefit4Title') || 'Priority Results'}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-sm text-muted-foreground">{t('membership.priceLabel') || 'Only'}</span>
                            <span className="text-3xl font-bold text-yellow-600">{t('membership.price') || 'Rp 10.000'}</span>
                            <span className="text-muted-foreground">{t('membership.period') || '/month'}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Product Form */}
                <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <CardTitle>{t('sell.productFormTitle') || 'List a New Product'}</CardTitle>
                        <CardDescription>
                            {t('sell.productFormDesc') || 'Fill in the details below to list your product. All fields marked with * are required.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-6">
                            {/* Product Images */}
                            <div>
                                <Label className="mb-2 block">Product Images *</Label>
                                <div className="flex flex-wrap gap-4">
                                    {images.map((img, index) => (
                                        <div
                                            key={index}
                                            className="relative w-24 h-24 rounded-lg overflow-hidden border"
                                        >
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setImages(images.filter((_, i) => i !== index))}
                                                className="absolute top-1 right-1 p-1 bg-background/80 rounded-full"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {images.length < 5 && (
                                        <label className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                                            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                                            <span className="text-xs text-muted-foreground">Upload</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setImages([...images, reader.result]);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Upload up to 5 images. First image will be the cover.
                                </p>
                            </div>

                            {/* Product Name */}
                            <div>
                                <Label htmlFor="name">Product Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Handcrafted Bamboo Basket"
                                    className="mt-1"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <Label>Category *</Label>
                                <Select>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Description */}
                            <div>
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe your product in detail..."
                                    className="mt-1 min-h-[120px]"
                                />
                            </div>

                            {/* Price and Stock */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="price">Price (₱) *</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        placeholder="0.00"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="stock">Stock Quantity *</Label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        placeholder="10"
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <Label>Tags</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        placeholder="Add tags..."
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                addTag();
                                            }
                                        }}
                                    />
                                    <Button type="button" variant="outline" onClick={addTag}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {tags.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="gap-1">
                                                {tag}
                                                <X
                                                    className="h-3 w-3 cursor-pointer"
                                                    onClick={() => removeTag(tag)}
                                                />
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Location */}
                            <div>
                                <Label htmlFor="location">Pickup/Shipping Location *</Label>
                                <Input
                                    id="location"
                                    placeholder="e.g., Makati City, Metro Manila"
                                    className="mt-1"
                                />
                            </div>

                            {/* Submit */}
                            <div className="flex gap-4 pt-4">
                                <Button type="button" variant="outline" className="flex-1">
                                    Save as Draft
                                </Button>
                                <Button type="submit" className="flex-1 gap-2">
                                    Publish Product
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default Sell;
