import { Download, Trash2, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getBackendUrl } from '@/config';

const BACKEND_URL = getBackendUrl();

function LogoCard({ logo, isSelected, onSelect, onDelete, isLoading }) {
  const getLogoUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };
  const logoUrl = getLogoUrl(logo.url);

  const handleDownload = async () => {
    if (!logoUrl) return;
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `logo-${logo.logoId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download logo:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate days until expiration
  const getDaysRemaining = () => {
    const expiresAt = new Date(logo.expiresAt);
    const now = new Date();
    const diffTime = expiresAt - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}>
      <CardContent className="p-0">
        <div className="relative aspect-square bg-muted">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo generated from: ${logo.prompt}`}
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : null}
          {isSelected && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <div className="bg-primary text-primary-foreground rounded-full p-2">
                <Check className="h-6 w-6" />
              </div>
            </div>
          )}
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {daysRemaining}d left
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 p-4">
        {/* Prompt text */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-muted-foreground line-clamp-2 text-center w-full">
                <Sparkles className="h-3 w-3 inline mr-1" />
                {logo.prompt}
              </p>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{logo.prompt}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Creation date */}
        <p className="text-xs text-muted-foreground">
          Created {formatDate(logo.createdAt)}
        </p>

        {/* Action buttons */}
        <div className="flex gap-2 w-full">
          <Button
            variant={isSelected ? "secondary" : "default"}
            size="sm"
            className="flex-1"
            onClick={onSelect}
            disabled={isLoading || isSelected}
          >
            {isSelected ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Selected
              </>
            ) : (
              'Use as Logo'
            )}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDownload}
                  disabled={isLoading}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download logo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onDelete}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete logo</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
}

export default LogoCard;
