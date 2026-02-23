import { cn } from "@/lib/utils"

function Skeleton({
    className,
    ...props
}) {
    return (
        (<div
            className={cn("animate-pulse rounded-md bg-muted", className)}
            {...props} />)
    );
}

function OrderCardSkeleton() {
    return (
        <div className="bg-card border rounded-lg p-4 mb-3">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex gap-3 py-3 border-t">
                <Skeleton className="h-14 w-14 rounded" />
                <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t mt-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24 rounded" />
            </div>
        </div>
    );
}

function ProductCardSkeleton() {
    return (
        <div className="bg-card border rounded-lg overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <div className="p-3">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
            </div>
        </div>
    );
}

function SellerCardSkeleton() {
    return (
        <div className="bg-card border rounded-lg p-4 flex items-center gap-4 mb-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
        </div>
    );
}

function ChatItemSkeleton() {
    return (
        <div className="flex items-center gap-3 p-4 border-b">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
                <Skeleton className="h-4 w-1/3 mb-2" />
                <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-3 w-8" />
        </div>
    );
}

function ProductsGridSkeleton({ count = 8 }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {Array.from({ length: count }).map((_, i) => (
                <ProductCardSkeleton key={i} />
            ))}
        </div>
    );
}

function OrdersListSkeleton({ count = 3 }) {
    return (
        <div className="p-4">
            {Array.from({ length: count }).map((_, i) => (
                <OrderCardSkeleton key={i} />
            ))}
        </div>
    );
}

function SellersListSkeleton({ count = 5 }) {
    return (
        <div className="p-4">
            {Array.from({ length: count }).map((_, i) => (
                <SellerCardSkeleton key={i} />
            ))}
        </div>
    );
}

function ChatListSkeleton({ count = 6 }) {
    return (
        <div>
            {Array.from({ length: count }).map((_, i) => (
                <ChatItemSkeleton key={i} />
            ))}
        </div>
    );
}

export { Skeleton, OrderCardSkeleton, ProductCardSkeleton, SellerCardSkeleton, ChatItemSkeleton, ProductsGridSkeleton, OrdersListSkeleton, SellersListSkeleton, ChatListSkeleton }
