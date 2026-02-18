import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Store, Star } from 'lucide-react';
import { resolveImageUrl } from '@/utils/imageUrl';
import './ProductCard.css';

function ProductCard({ product }) {
  const navigate = useNavigate();



  const handleSellerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.seller?._id) {
      navigate(`/store/${product.seller._id}`);
    }
  };

  return (
    <Link to={`/product/${product._id}`} className="product-card card">
      <div className="product-image-container">
        {product.images?.[0] ? (
          <img src={resolveImageUrl(product.images[0])} alt={product.name} className="product-image" />
        ) : (
          <div className="product-image-placeholder">
            <span>📷</span>
          </div>
        )}
        <span className="product-category">{product.category}</span>
      </div>

      <div className="product-details">
        <h3 className="product-name">{product.name}</h3>

        <div className="product-seller-info" onClick={handleSellerClick} title="View store">
          <Store size={14} />
          <span className="seller-link">{product.seller?.businessName || product.seller?.name}</span>
          {product.seller?.rating > 0 && (
            <span className="seller-rating">
              <Star size={12} fill="#fbbf24" />
              {product.seller.rating.toFixed(1)}
            </span>
          )}
        </div>

        {product.location?.city && (
          <div className="product-location">
            <MapPin size={14} />
            <span>{product.location.city}</span>
          </div>
        )}

        <div className="product-footer">
          <p className="font-bold text-lg text-primary">Rp {product.price}</p>
          {product.stock > 0 ? (
            <span className="stock-badge in-stock">In Stock</span>
          ) : (
            <span className="stock-badge out-of-stock">Out of Stock</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
