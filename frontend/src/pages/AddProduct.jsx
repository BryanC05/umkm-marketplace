import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, Plus, X, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import api from '../utils/api';
import LocationPicker from '../components/LocationPicker';
import Layout from '@/components/layout/Layout';
import './AddProduct.css';

const categories = [
  { id: 'food', name: 'Food & Beverages' },
  { id: 'clothing', name: 'Clothing & Apparel' },
  { id: 'handicrafts', name: 'Handicrafts' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'home', name: 'Home & Living' },
  { id: 'beauty', name: 'Beauty & Health' },
  { id: 'agriculture', name: 'Agriculture' },
  { id: 'other', name: 'Others' },
];

const MAX_IMAGES = 4;
const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_SELLER_LOCATION = {
  coordinates: [106.9896, -6.2349],
  address: 'Default Location',
  city: 'Bekasi',
  state: 'West Java',
};

const formatUploadWarning = (warning) => {
  if (!warning) return null;
  if (warning.code === 'enhancement_unavailable') {
    return 'Image enhancement is currently unavailable on the server. Original image uploaded.';
  }
  return warning.message || 'Image was uploaded with warnings.';
};

function AddProduct() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageItems, setImageItems] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [, setLocationStatus] = useState('getting');
  const [imageError, setImageError] = useState('');
  const [uploadWarnings, setUploadWarnings] = useState([]);
  const locationInitializedRef = useRef(false);

  // Variant state
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState([{ name: '', price: '', stock: '' }]);

  // Option groups state
  const [optionGroups, setOptionGroups] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    unit: 'pieces',
  });

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Get seller's current location on component mount
  useEffect(() => {
    if (locationInitializedRef.current) return;
    locationInitializedRef.current = true;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            coordinates: [position.coords.longitude, position.coords.latitude],
            address: 'Current Location',
            city: '',
            state: ''
          });
          setLocationStatus('success');
        },
        (error) => {
          console.warn('Could not get current location, using default:', error);
          setCurrentLocation(DEFAULT_SELLER_LOCATION);
          setLocationStatus('fallback');
        }
      );
    } else {
      queueMicrotask(() => {
        setCurrentLocation(DEFAULT_SELLER_LOCATION);
        setLocationStatus('unsupported');
      });
    }
  }, []);

  const addMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/products', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['sellerProducts']);
      queryClient.invalidateQueries({ queryKey: ['sellerProducts'] });
      navigate('/seller/dashboard');
    },
  });

  const validateImageFile = (file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return `${file.name}: Unsupported image format`;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return `${file.name}: File exceeds ${MAX_IMAGE_SIZE_MB}MB`;
    }
    return null;
  };

  const processProductImage = async (file, enhance) => {
    const formPayload = new FormData();
    formPayload.append('image', file);
    formPayload.append('enhance', enhance ? 'true' : 'false');

    const response = await api.post('/product-images/process', formPayload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (!response.data?.success || !response.data?.image?.url) {
      throw new Error('Failed to process image');
    }

    return {
      url: response.data.image.url,
      warning: response.data.warning || null,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    addMutation.reset();
    setImageError('');
    setUploadWarnings([]);
    setImageItems((prev) => prev.map((item) => ({ ...item, error: null })));

    if (imageItems.length === 0) {
      setImageError('Please upload at least one product image');
      return;
    }

    const uploadedUrls = [];

    try {
      for (const imageItem of imageItems) {
        setImageItems((prev) =>
          prev.map((item) =>
            item.id === imageItem.id
              ? { ...item, uploadState: 'uploading', warning: null, error: null }
              : item
          )
        );

        const processed = await processProductImage(imageItem.file, imageItem.enhance);
        uploadedUrls.push(processed.url);

        setImageItems((prev) =>
          prev.map((item) =>
            item.id === imageItem.id
              ? {
                ...item,
                uploadState: 'done',
                uploadedUrl: processed.url,
                warning: formatUploadWarning(processed.warning),
                error: null,
              }
              : item
          )
        );

        const warningMessage = formatUploadWarning(processed.warning);
        if (warningMessage) {
          setUploadWarnings((prev) => (prev.includes(warningMessage) ? prev : [...prev, warningMessage]));
        }
      }

      const productData = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        images: uploadedUrls,
        tags,
        currentLocation,
        hasVariants,
        variants: hasVariants ? variants.map(v => ({
          name: v.name,
          price: Number(v.price),
          stock: Number(v.stock)
        })) : [],
        optionGroups: optionGroups.map(g => ({
          name: g.name,
          required: g.required,
          multiple: g.multiple,
          options: g.options.map(o => ({
            name: o.name,
            priceAdjust: Number(o.priceAdjust) || 0
          }))
        }))
      };

      await addMutation.mutateAsync(productData);
    } catch (err) {
      setImageError(err.response?.data?.message || err.message || 'Failed to process images');
      setImageItems((prev) =>
        prev.map((item) =>
          item.uploadState === 'uploading'
            ? { ...item, uploadState: 'error', error: 'Upload failed' }
            : item
        )
      );

      if (uploadedUrls.length > 0) {
        try {
          await api.delete('/product-images/cleanup', { data: { urls: uploadedUrls } });
        } catch (cleanupErr) {
          console.error('Failed to cleanup uploaded images:', cleanupErr);
        }
      }
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) {
      alert("Please enter a product name first.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      const response = await api.post('/ai/generate-description', {
        name: formData.name,
        keywords: tags.join(', ')
      });
      setFormData(prev => ({ ...prev, description: response.data.description }));
    } catch (err) {
      console.error("AI Generation failed:", err);
      alert(err.response?.data?.error || "Failed to generate AI description. Please try again.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageError('');
    const remainingSlots = MAX_IMAGES - imageItems.length;
    const filesToProcess = files.slice(0, Math.max(remainingSlots, 0));
    const validationErrors = [];

    if (files.length > remainingSlots) {
      validationErrors.push(`Only ${MAX_IMAGES} images are allowed`);
    }

    const nextItems = filesToProcess.reduce((acc, file) => {
      const validationError = validateImageFile(file);
      if (validationError) {
        validationErrors.push(validationError);
        return acc;
      }

      acc.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        file,
        preview: URL.createObjectURL(file),
        originalPreview: URL.createObjectURL(file),
        enhance: false,
        enhancing: false,
        uploadedUrl: null,
        uploadState: 'pending',
        warning: null,
        error: null,
      });
      return acc;
    }, []);

    setImageItems((prev) => [...prev, ...nextItems]);
    if (validationErrors.length > 0) {
      setImageError(validationErrors.join(' | '));
    }

    e.target.value = '';
  };

  const removeImage = (id) => {
    setImageItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const toggleEnhance = async (id) => {
    const item = imageItems.find((i) => i.id === id);
    if (!item) return;

    const newEnhance = !item.enhance;

    if (!newEnhance) {
      // Turning off enhance — revert to original preview
      setImageItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, enhance: false, preview: i.originalPreview } : i
        )
      );
      return;
    }

    // Turning on enhance — call preview endpoint
    setImageItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, enhance: true, enhancing: true } : i
      )
    );

    try {
      const formPayload = new FormData();
      formPayload.append('image', item.file);
      const response = await api.post('/product-images/preview-enhance', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success && response.data?.enhancedUrl) {
        setImageItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, enhancing: false, preview: response.data.enhancedUrl }
              : i
          )
        );
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error('Enhancement preview failed:', err);
      setImageItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, enhance: false, enhancing: false, error: 'Enhancement failed' }
            : i
        )
      );
    }
  };

  const addTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // --- Variant helpers ---
  const addVariant = () => {
    setVariants([...variants, { name: '', price: '', stock: '' }]);
  };

  const updateVariant = (index, field, value) => {
    setVariants(variants.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const removeVariant = (index) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  // --- Option group helpers ---
  const addOptionGroup = () => {
    setOptionGroups([...optionGroups, {
      name: '',
      required: false,
      multiple: false,
      options: [{ name: '', priceAdjust: '' }],
      collapsed: false
    }]);
  };

  const updateOptionGroup = (gIndex, field, value) => {
    setOptionGroups(optionGroups.map((g, i) => i === gIndex ? { ...g, [field]: value } : g));
  };

  const removeOptionGroup = (gIndex) => {
    setOptionGroups(optionGroups.filter((_, i) => i !== gIndex));
  };

  const addOption = (gIndex) => {
    setOptionGroups(optionGroups.map((g, i) =>
      i === gIndex ? { ...g, options: [...g.options, { name: '', priceAdjust: '' }] } : g
    ));
  };

  const updateOption = (gIndex, oIndex, field, value) => {
    setOptionGroups(optionGroups.map((g, i) =>
      i === gIndex ? {
        ...g,
        options: g.options.map((o, j) => j === oIndex ? { ...o, [field]: value } : o)
      } : g
    ));
  };

  const removeOption = (gIndex, oIndex) => {
    setOptionGroups(optionGroups.map((g, i) =>
      i === gIndex ? {
        ...g,
        options: g.options.length > 1 ? g.options.filter((_, j) => j !== oIndex) : g.options
      } : g
    ));
  };

  const toggleGroupCollapse = (gIndex) => {
    setOptionGroups(optionGroups.map((g, i) =>
      i === gIndex ? { ...g, collapsed: !g.collapsed } : g
    ));
  };

  return (
    <Layout>
      <div className="add-product container py-8">
        <button onClick={() => navigate(-1)} className="back-button inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="add-product-container max-w-4xl mx-auto">
          <div className="form-header text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Add New Product</h1>
            <p className="text-muted-foreground">List your product for nearby customers</p>
          </div>

          <form onSubmit={handleSubmit} className="product-form space-y-8">
            {/* Basic Info */}
            <div className="form-section p-6 border rounded-lg bg-card">
              <h3 className="text-xl font-semibold mb-6 pb-2 border-b">Basic Information</h3>

              <div className="space-y-4">
                <div className="form-group">
                  <label htmlFor="name" className="block text-sm font-medium mb-1">Product Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter product name"
                    className="w-full p-2 border rounded-md bg-background text-foreground"
                  />
                </div>

                <div className="form-group">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="description" className="block text-sm font-medium">Description *</label>
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={isGeneratingAI || !formData.name}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 border border-purple-200 rounded-md hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800"
                    >
                      {isGeneratingAI ? (
                        <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
                      )}
                      {isGeneratingAI ? 'Generating...' : 'Enhance with AI'}
                    </button>
                  </div>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows="6"
                    placeholder="Describe your product... (Tip: Add a product name and tags first, then use AI to write this!)"
                    className="w-full p-2 border rounded-md bg-background text-foreground resize-y focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="category" className="block text-sm font-medium mb-1">Category *</label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                      className="w-full p-2 border rounded-md bg-background text-foreground"
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="unit" className="block text-sm font-medium mb-1">Unit</label>
                    <select
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full p-2 border rounded-md bg-background text-foreground"
                    >
                      <option value="pieces">Pieces</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="grams">Grams (g)</option>
                      <option value="liters">Liters (L)</option>
                      <option value="meters">Meters (m)</option>
                      <option value="pairs">Pairs</option>
                      <option value="dozen">Dozen</option>
                      <option value="cups">Cups</option>
                      <option value="portions">Portions</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="form-section p-6 border rounded-lg bg-card">
              <h3 className="text-xl font-semibold mb-6 pb-2 border-b">Pricing & Stock</h3>

              {/* Variant Toggle */}
              <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-muted/50 border">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted-foreground/30 rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                </label>
                <div>
                  <span className="text-sm font-medium">This product has size/type variants</span>
                  <p className="text-xs text-muted-foreground">e.g. Small, Medium, Large with different prices</p>
                </div>
              </div>

              {!hasVariants ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                    <label htmlFor="price" className="block text-sm font-medium mb-1">Price (Rp) *</label>
                    <input
                      type="number"
                      id="price"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      placeholder="Enter price"
                      className="w-full p-2 border rounded-md bg-background text-foreground"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="stock" className="block text-sm font-medium mb-1">Stock Quantity *</label>
                    <input
                      type="number"
                      id="stock"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                      min="0"
                      placeholder="Available stock"
                      className="w-full p-2 border rounded-md bg-background text-foreground"
                    />
                  </div>
                </div>
              ) : (
                <div className="variants-builder space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Product Variants</label>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Plus size={14} /> Add Variant
                    </button>
                  </div>
                  {variants.map((variant, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                      <input
                        type="text"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        placeholder="Variant name (e.g. Large)"
                        className="flex-1 p-2 border rounded-md bg-background text-foreground text-sm"
                        required
                      />
                      <input
                        type="number"
                        value={variant.price}
                        onChange={(e) => updateVariant(index, 'price', e.target.value)}
                        placeholder="Price (Rp)"
                        className="w-28 p-2 border rounded-md bg-background text-foreground text-sm"
                        min="0"
                        required
                      />
                      <input
                        type="number"
                        value={variant.stock}
                        onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                        placeholder="Stock"
                        className="w-20 p-2 border rounded-md bg-background text-foreground text-sm"
                        min="0"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        disabled={variants.length <= 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Option Groups (Menus) */}
            <div className="form-section p-6 border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <div>
                  <h3 className="text-xl font-semibold">Custom Options (Optional)</h3>
                  <p className="text-sm text-muted-foreground mt-1">Add customizable menus like &quot;Choose chicken part&quot;, &quot;Ice level&quot;, etc.</p>
                </div>
                <button
                  type="button"
                  onClick={addOptionGroup}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Plus size={14} /> Add Menu
                </button>
              </div>

              {optionGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>No custom options added yet.</p>
                  <p className="text-xs mt-1">Great for food & beverages — let buyers customize their order!</p>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  {optionGroups.map((group, gIndex) => (
                    <div key={gIndex} className="border rounded-lg overflow-hidden">
                      {/* Group Header */}
                      <div className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer" onClick={() => toggleGroupCollapse(gIndex)}>
                        <button type="button" className="p-0.5">
                          {group.collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => updateOptionGroup(gIndex, 'name', e.target.value)}
                          placeholder="Menu name (e.g. Choose Chicken Part)"
                          className="flex-1 p-1.5 border rounded-md bg-background text-foreground text-sm"
                          onClick={(e) => e.stopPropagation()}
                          required
                        />
                        <label className="inline-flex items-center gap-1 text-xs whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={group.required}
                            onChange={(e) => updateOptionGroup(gIndex, 'required', e.target.checked)}
                            className="rounded"
                          />
                          Required
                        </label>
                        <label className="inline-flex items-center gap-1 text-xs whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={group.multiple}
                            onChange={(e) => updateOptionGroup(gIndex, 'multiple', e.target.checked)}
                            className="rounded"
                          />
                          Multi-select
                        </label>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeOptionGroup(gIndex); }}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Group Options */}
                      {!group.collapsed && (
                        <div className="p-3 space-y-2">
                          {group.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) => updateOption(gIndex, oIndex, 'name', e.target.value)}
                                placeholder="Option name (e.g. Breast)"
                                className="flex-1 p-2 border rounded-md bg-background text-foreground text-sm"
                                required
                              />
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">+Rp</span>
                                <input
                                  type="number"
                                  value={option.priceAdjust}
                                  onChange={(e) => updateOption(gIndex, oIndex, 'priceAdjust', e.target.value)}
                                  placeholder="0"
                                  className="w-24 p-2 border rounded-md bg-background text-foreground text-sm"
                                  min="0"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeOption(gIndex, oIndex)}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                disabled={group.options.length <= 1}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addOption(gIndex)}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                          >
                            <Plus size={14} /> Add Option
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="form-section p-6 border rounded-lg bg-card">
              <h3 className="text-xl font-semibold mb-6 pb-2 border-b">Product Location</h3>
              <p className="text-sm text-muted-foreground mb-4">Where is this product located? (Defaults to your current location)</p>

              <div style={{ marginTop: '1rem' }}>
                <LocationPicker
                  onLocationSelect={(loc) => {
                    setCurrentLocation({
                      coordinates: [loc.lng, loc.lat],
                      address: loc.address,
                      city: loc.city,
                      state: loc.state,
                      pincode: loc.pincode
                    });
                  }}
                  initialLocation={currentLocation ? { lat: currentLocation.coordinates[1], lng: currentLocation.coordinates[0] } : null}
                />
              </div>
            </div>

            {/* Images */}
            <div className="form-section p-6 border rounded-lg bg-card">
              <h3 className="text-xl font-semibold mb-6 pb-2 border-b">Product Images</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Up to {MAX_IMAGES} images, max {MAX_IMAGE_SIZE_MB}MB each (JPEG, PNG, WEBP)
              </p>

              <div className="image-upload mb-4">
                <label htmlFor="images" className="upload-btn inline-flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <Upload size={24} className="mb-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload</span>
                </label>
                <input
                  type="file"
                  id="images"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  disabled={imageItems.length >= MAX_IMAGES || addMutation.isPending}
                  style={{ display: 'none' }}
                />
              </div>

              {imageError && (
                <div className="mb-3 p-2 border rounded text-sm text-destructive border-destructive/30 bg-destructive/5">
                  {imageError}
                </div>
              )}

              {uploadWarnings.length > 0 && (
                <div className="mb-3 p-2 border rounded text-sm text-amber-700 border-amber-300 bg-amber-50">
                  {uploadWarnings.join(' | ')}
                </div>
              )}

              {imageItems.length > 0 && (
                <div className="image-preview-grid grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imageItems.map((item, index) => (
                    <div key={item.id} className="image-preview image-preview-enhance relative w-32 h-44 border rounded-lg overflow-hidden group">
                      <div className="relative w-full h-28">
                        <img src={item.preview} alt={`Preview ${index + 1}`} className="image-preview-media w-full h-28 object-cover" />
                        {item.enhancing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
                          </div>
                        )}
                        {item.enhance && !item.enhancing && (
                          <span className="absolute top-1 left-1 bg-purple-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">ENHANCED</span>
                        )}
                      </div>
                      <div className="p-2 border-t text-[11px] space-y-1">
                        <button
                          type="button"
                          className={`inline-flex w-full items-center justify-center gap-1 px-2 py-1 rounded border transition-colors ${item.enhance ? 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-900/40 dark:border-purple-600 dark:text-purple-300' : 'border-muted-foreground/30 text-muted-foreground'}`}
                          onClick={() => toggleEnhance(item.id)}
                          disabled={addMutation.isPending || item.enhancing}
                        >
                          <Sparkles size={12} />
                          {item.enhancing ? 'Enhancing...' : item.enhance ? 'Enhanced ✓' : 'Enhance'}
                        </button>
                        {item.uploadState === 'uploading' && <p className="text-blue-600">Uploading...</p>}
                        {item.uploadState === 'done' && <p className="text-green-600">Ready</p>}
                        {item.warning && <p className="text-amber-700">{item.warning}</p>}
                        {item.error && <p className="text-destructive">{item.error}</p>}
                      </div>
                      <button
                        type="button"
                        className="remove-image absolute top-1 right-1 p-1 bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={() => removeImage(item.id)}
                        disabled={addMutation.isPending}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="form-section p-6 border rounded-lg bg-card">
              <h3 className="text-xl font-semibold mb-6 pb-2 border-b">Tags</h3>

              <div className="tags-section">
                <div className="tag-input-wrapper flex gap-2 mb-4">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag (e.g., handmade, organic)"
                    className="flex-1 p-2 border rounded-md bg-background text-foreground"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addTag(e);
                    }}
                  />
                  <button type="button" onClick={addTag} className="add-tag-btn px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
                    <Plus size={16} />
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="tags-list flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="tag-item inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="form-actions flex gap-4 pt-4 border-t">
              <button
                type="button"
                className="btn-secondary flex-1 py-3 border rounded-md hover:bg-muted"
                onClick={() => navigate('/seller/dashboard')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                disabled={addMutation.isPending || imageItems.length === 0}
              >
                {addMutation.isPending ? 'Adding Product...' : 'Add Product'}
              </button>
            </div>

            {addMutation.isError && (
              <div className="error-message p-3 mt-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                {addMutation.error?.response?.data?.message || 'Failed to add product'}
              </div>
            )}
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default AddProduct;
