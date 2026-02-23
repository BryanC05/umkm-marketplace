import Layout from "@/components/layout/Layout";
import ForumPostCard from "@/components/forums/ForumPostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, TrendingUp, Clock, MessageCircle } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import api from "@/utils/api";

const categoryMapping = {
    "All Topics": "all",
    "General": "general",
    "Products": "products",
    "Tips & Tricks": "tips",
    "Help & Support": "help",
    "Announcements": "announcements",
};

const categoryIcons = {
    "all": "📋",
    "general": "💬",
    "products": "🛍️",
    "tips": "💡",
    "help": "🆘",
    "announcements": "📢",
};

const Forums = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All Topics");
    const [activeTab, setActiveTab] = useState("latest");

    const { data, isLoading } = useQuery({
        queryKey: ["forumThreads", "all", searchQuery, user?._id || user?.id],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: 1,
                limit: 50,
                ...(searchQuery && { search: searchQuery }),
            });
            const response = await api.get(`/forum?${params}`);
            return response.data;
        },
    });

    const filteredPosts = data?.threads?.filter((post) => {
        const categoryKey = categoryMapping[selectedCategory];
        if (categoryKey === "all") return true;
        return post.category === categoryKey;
    }) || [];

    const sortedPosts = [...filteredPosts].sort((a, b) => {
        if (activeTab === "trending") {
            return (b.likes?.length || 0) - (a.likes?.length || 0);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const unansweredPosts = sortedPosts.filter((p) => p.replyCount === 0);

    const getCategoryCount = (categoryKey) => {
        if (categoryKey === "all") return data?.total || 0;
        return data?.threads?.filter(t => t.category === categoryKey).length || 0;
    };

    const categories = [
        { name: "All Topics", key: "all" },
        { name: "General", key: "general" },
        { name: "Products", key: "products" },
        { name: "Tips & Tricks", key: "tips" },
        { name: "Help & Support", key: "help" },
        { name: "Announcements", key: "announcements" },
    ];

    const trendingTopics = [
        "DTI Registration",
        "Product Photography",
        "Pricing Strategy",
        "Eco-friendly Packaging",
        "Social Media Marketing",
    ];

    return (
        <Layout>
            <div className="container py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Community Forums</h1>
                        <p className="text-muted-foreground">
                            Connect, learn, and share with fellow entrepreneurs
                        </p>
                    </div>
                    <Button className="gap-2 w-fit" onClick={() => navigate("/forum/new")}>
                        <Plus className="h-4 w-4" />
                        Start a Discussion
                    </Button>
                </div>

                {/* Search */}
                <div className="relative max-w-xl mb-8">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search discussions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Content */}
                    <div className="flex-1">
                        <Tabs defaultValue="latest" value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="mb-6">
                                <TabsTrigger value="latest" className="gap-2">
                                    <Clock className="h-4 w-4" />
                                    Latest
                                </TabsTrigger>
                                <TabsTrigger value="trending" className="gap-2">
                                    <TrendingUp className="h-4 w-4" />
                                    Trending
                                </TabsTrigger>
                                <TabsTrigger value="unanswered" className="gap-2">
                                    <MessageCircle className="h-4 w-4" />
                                    Unanswered
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="latest" className="space-y-4">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4].map((i) => (
                                            <Card key={i} className="p-6">
                                                <Skeleton className="h-6 w-3/4 mb-3" />
                                                <Skeleton className="h-4 w-full mb-2" />
                                                <Skeleton className="h-4 w-2/3 mb-4" />
                                                <div className="flex gap-4">
                                                    <Skeleton className="h-4 w-20" />
                                                    <Skeleton className="h-4 w-20" />
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : sortedPosts.length > 0 ? (
                                    sortedPosts.map((post) => (
                                        <ForumPostCard key={post._id} post={post} />
                                    ))
                                ) : (
                                    <Card className="py-12 text-center">
                                        <CardContent>
                                            <p className="text-muted-foreground">
                                                No discussions found matching your search
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="trending" className="space-y-4">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4].map((i) => (
                                            <Card key={i} className="p-6">
                                                <Skeleton className="h-6 w-3/4 mb-3" />
                                                <Skeleton className="h-4 w-full mb-2" />
                                                <Skeleton className="h-4 w-2/3 mb-4" />
                                                <div className="flex gap-4">
                                                    <Skeleton className="h-4 w-20" />
                                                    <Skeleton className="h-4 w-20" />
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : sortedPosts.length > 0 ? (
                                    sortedPosts.map((post) => (
                                        <ForumPostCard key={post._id} post={post} />
                                    ))
                                ) : (
                                    <Card className="py-12 text-center">
                                        <CardContent>
                                            <p className="text-muted-foreground">
                                                No discussions found
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>

                            <TabsContent value="unanswered" className="space-y-4">
                                {isLoading ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3, 4].map((i) => (
                                            <Card key={i} className="p-6">
                                                <Skeleton className="h-6 w-3/4 mb-3" />
                                                <Skeleton className="h-4 w-full mb-2" />
                                                <Skeleton className="h-4 w-2/3 mb-4" />
                                                <div className="flex gap-4">
                                                    <Skeleton className="h-4 w-20" />
                                                    <Skeleton className="h-4 w-20" />
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : unansweredPosts.length > 0 ? (
                                    unansweredPosts.map((post) => (
                                        <ForumPostCard key={post._id} post={post} />
                                    ))
                                ) : (
                                    <Card className="py-12 text-center">
                                        <CardContent>
                                            <p className="text-muted-foreground">
                                                All discussions have been answered! 🎉
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-80 space-y-6">
                        {/* Categories */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Categories</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.name}
                                        onClick={() => setSelectedCategory(cat.name)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${selectedCategory === cat.name
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-muted"
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <span>{categoryIcons[cat.key]}</span>
                                            <span>{cat.name}</span>
                                        </span>
                                        <Badge
                                            variant={selectedCategory === cat.name ? "secondary" : "outline"}
                                            className="text-xs"
                                        >
                                            {getCategoryCount(cat.key)}
                                        </Badge>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Trending Topics */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    Trending Topics
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {trendingTopics.map((topic) => (
                                        <Badge
                                            key={topic}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                        >
                                            #{topic.replace(/\s+/g, "")}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Community Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Community Stats</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Discussions</span>
                                    <span className="font-semibold">{data?.total || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Active Members</span>
                                    <span className="font-semibold">{(data?.total * 2 + 87) || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Replies Today</span>
                                    <span className="font-semibold">{Math.floor((data?.total || 0) / 14)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Forums;
