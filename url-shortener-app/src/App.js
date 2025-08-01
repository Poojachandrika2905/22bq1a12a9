import React, { useState, useEffect } from 'react';



// Mock Logging Middleware (as required by assignment)
const Logger = {
  info: (message, data) => console.log(`[INFO] ${message}`, data),
  error: (message, data) => console.error(`[ERROR] ${message}`, data),
  warn: (message, data) => console.warn(`[WARN] ${message}`, data)
};

// Utility functions
const generateShortCode = () => {
  return Math.random().toString(36).substring(2, 8);
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidShortCode = (code) => {
  return /^[a-zA-Z0-9]{3,10}$/.test(code);
};

// Mock geolocation and source detection (as per requirements)
const getMockClickData = () => ({
  timestamp: new Date().toISOString(),
  source: ['direct', 'social', 'email', 'search'][Math.floor(Math.random() * 4)],
  location: ['New York, US', 'London, UK', 'Tokyo, JP', 'Sydney, AU'][Math.floor(Math.random() * 4)]
});

// Alert Component
const Alert = ({ message, type, onClose }) => (
  <div className={`alert alert-${type}`}>
    <span className="material-icons">{
      type === 'success' ? 'check_circle' :
      type === 'error' ? 'error' :
      type === 'warning' ? 'warning' : 'info'
    }</span>
    {message}
    <button className="alert-close" onClick={onClose}>×</button>
  </div>
);

// URL Form Component
const URLForm = ({ url, index, onUpdate }) => {
  const handleChange = (field, value) => {
    onUpdate(index, field, value);
  };

  return (
    <div className="url-card">
      <h4>URL #{index + 1}</h4>
      <div className="form-row">
        <div className="input-group">
          <label className="input-label">Original URL</label>
          <input
            type="text"
            className={`input-field ${url.errors.originalUrl ? 'error' : ''}`}
            value={url.originalUrl}
            placeholder="https://example.com"
            onChange={(e) => handleChange('originalUrl', e.target.value)}
          />
          {url.errors.originalUrl && (
            <div className="error-text">{url.errors.originalUrl}</div>
          )}
        </div>
        <div className="input-group">
          <label className="input-label">Validity (minutes)</label>
          <input
            type="number"
            className={`input-field ${url.errors.validityMinutes ? 'error' : ''}`}
            value={url.validityMinutes}
            min="1"
            max="10080"
            onChange={(e) => handleChange('validityMinutes', parseInt(e.target.value) || 30)}
          />
          {url.errors.validityMinutes ? (
            <div className="error-text">{url.errors.validityMinutes}</div>
          ) : (
            <div className="helper-text">Default: 30 minutes</div>
          )}
        </div>
        <div className="input-group">
          <label className="input-label">Custom Short Code</label>
          <input
            type="text"
            className={`input-field ${url.errors.customShortCode ? 'error' : ''}`}
            value={url.customShortCode}
            placeholder="mycode123"
            onChange={(e) => handleChange('customShortCode', e.target.value)}
          />
          {url.errors.customShortCode ? (
            <div className="error-text">{url.errors.customShortCode}</div>
          ) : (
            <div className="helper-text">Optional: 3-10 alphanumeric</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Click Details Modal
const ClickDetailsModal = ({ isOpen, url, onClose }) => {
  if (!isOpen || !url) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Click Details for /{url.shortCode}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {url.clickData.length === 0 ? (
            <p>No clicks recorded yet.</p>
          ) : (
            url.clickData.map((click, index) => (
              <div key={index} className="click-item">
                <h4>Click #{index + 1}</h4>
                <p>
                  <span className="material-icons">schedule</span>
                  {new Date(click.timestamp).toLocaleString()}
                </p>
                <p>
                  <span className="material-icons">source</span>
                  Source: {click.source}
                </p>
                <p>
                  <span className="material-icons">location_on</span>
                  Location: {click.location}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [urls, setUrls] = useState([]);
  const [shortenedUrls, setShortenedUrls] = useState(() => {
    const saved = localStorage.getItem('shortenedUrls');
    return saved ? JSON.parse(saved) : [];
  });
  const [alerts, setAlerts] = useState([]);
  const [modalUrl, setModalUrl] = useState(null);

  // Initialize URLs array with 5 empty entries
  useEffect(() => {
    setUrls(Array(1).fill(null).map((_, index) => ({
      id: index,
      originalUrl: '',
      validityMinutes: 30,
      customShortCode: '',
      errors: {}
    })));
    Logger.info('Application initialized');
  }, []);

  // Save to localStorage whenever shortenedUrls changes
  useEffect(() => {
    localStorage.setItem('shortenedUrls', JSON.stringify(shortenedUrls));
    Logger.info('Updated shortened URLs in storage', { count: shortenedUrls.length });
  }, [shortenedUrls]);

  // Clean up expired URLs
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setShortenedUrls(prev => {
        const active = prev.filter(url => new Date(url.expiryDate) > now);
        if (active.length !== prev.length) {
          Logger.info('Cleaned up expired URLs', { removed: prev.length - active.length });
        }
        return active;
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const showAlert = (message, type = 'info') => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    }, 5000);
  };

  const validateUrl = (url, index) => {
    const errors = {};
    
    if (!url.originalUrl.trim()) {
      errors.originalUrl = 'URL is required';
    } else if (!isValidUrl(url.originalUrl)) {
      errors.originalUrl = 'Please enter a valid URL';
    }

    if (url.validityMinutes < 1 || url.validityMinutes > 10080) {
      errors.validityMinutes = 'Validity must be between 1 and 10080 minutes';
    }

    if (url.customShortCode && !isValidShortCode(url.customShortCode)) {
      errors.customShortCode = 'Short code must be 3-10 alphanumeric characters';
    }

    // Check for duplicate shortcodes
    if (url.customShortCode) {
      const isDuplicate = shortenedUrls.some(existing => existing.shortCode === url.customShortCode) ||
                         urls.some((other, otherIndex) => 
                           otherIndex !== index && 
                           other.customShortCode === url.customShortCode
                         );
      if (isDuplicate) {
        errors.customShortCode = 'This short code is already in use';
      }
    }

    return errors;
  };

  const updateUrl = (index, field, value) => {
    setUrls(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Clear related errors when user types
      if (updated[index].errors[field]) {
        const newErrors = { ...updated[index].errors };
        delete newErrors[field];
        updated[index].errors = newErrors;
      }
      
      return updated;
    });
  };

  const shortenUrls = () => {
    Logger.info('Starting URL shortening process');
    const validUrls = [];
    const updatedUrls = [...urls];

    // Validate all URLs first
    urls.forEach((url, index) => {
      if (url.originalUrl.trim()) {
        const errors = validateUrl(url, index);
        updatedUrls[index].errors = errors;
        
        if (Object.keys(errors).length === 0) {
          validUrls.push({ ...url, index });
        }
      }
    });

    setUrls(updatedUrls);

    if (validUrls.length === 0) {
      showAlert('Please enter at least one valid URL', 'warning');
      return;
    }

    // Generate shortened URLs
    const newShortenedUrls = validUrls.map(url => {
      const shortCode = url.customShortCode || generateShortCode();
      const creationDate = new Date();
      const expiryDate = new Date(creationDate.getTime() + url.validityMinutes * 60000);
      
      const shortenedUrl = {
        id: Date.now() + Math.random(),
        originalUrl: url.originalUrl,
        shortCode,
        shortUrl: `http://localhost:3000/${shortCode}`,
        creationDate: creationDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        validityMinutes: url.validityMinutes,
        clicks: 0,
        clickData: []
      };

      Logger.info('Created shortened URL', { shortCode, originalUrl: url.originalUrl });
      return shortenedUrl;
    });

    setShortenedUrls(prev => [...prev, ...newShortenedUrls]);
    
    // Clear successful entries
    validUrls.forEach(url => {
      updatedUrls[url.index] = {
        id: url.index,
        originalUrl: '',
        validityMinutes: 30,
        customShortCode: '',
        errors: {}
      };
    });
    setUrls(updatedUrls);

    showAlert(`Successfully shortened ${newShortenedUrls.length} URL(s)`, 'success');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showAlert('Copied to clipboard!', 'success');
    }).catch(() => {
      showAlert('Failed to copy to clipboard', 'error');
    });
  };

  const handleRedirect = (shortCode) => {
    const urlData = shortenedUrls.find(url => url.shortCode === shortCode);
    
    if (!urlData) {
      Logger.error('Short URL not found', { shortCode });
      showAlert('Short URL not found', 'error');
      return;
    }

    if (new Date() > new Date(urlData.expiryDate)) {
      Logger.warn('Attempted access to expired URL', { shortCode });
      showAlert('This short URL has expired', 'error');
      return;
    }

    // Record click data
    const clickData = getMockClickData();
    setShortenedUrls(prev => prev.map(url => 
      url.shortCode === shortCode 
        ? { 
            ...url, 
            clicks: url.clicks + 1,
            clickData: [...url.clickData, clickData]
          }
        : url
    ));

    Logger.info('Redirecting user', { shortCode, originalUrl: urlData.originalUrl });
    window.open(urlData.originalUrl, '_blank');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeRemaining = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  return (
    <div className="App">
      {/* App Bar */}
      <header className="app-header">
        <div className="header-content">
          <span className="material-icons">link</span>
          <h1>URL Shortener Application</h1>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs">
        <button 
          className={`tab ${activeTab === 0 ? 'active' : ''}`}
          onClick={() => setActiveTab(0)}
        >
          URL Shortener
        </button>
        <button 
          className={`tab ${activeTab === 1 ? 'active' : ''}`}
          onClick={() => setActiveTab(1)}
        >
          Statistics
        </button>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 0 && (
          <div className="shortener-page">
            <div className="card">
              <div className="card-header">
                <h2>URL Shortener</h2>
                <p>Shorten up to 5 URLs concurrently. Each URL can have a custom validity period and shortcode.</p>
              </div>
              <div className="card-content">
                {urls.map((url, index) => (
                  <URLForm
                    key={url.id}
                    url={url}
                    index={index}
                    onUpdate={updateUrl}
                  />
                ))}
                
                <div className="action-section">
                  <button className="btn btn-primary" onClick={shortenUrls}>
                    <span className="material-icons">link</span>
                    Shorten URLs
                  </button>
                </div>
              </div>
            </div>

            {/* Recent URLs */}
            {shortenedUrls.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <h3>Recently Created Short URLs</h3>
                </div>
                <div className="card-content">
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Original URL</th>
                          <th>Short URL</th>
                          <th>Expires</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shortenedUrls.slice(-5).reverse().map((url) => (
                          <tr key={url.id}>
                            <td>
                              <div className="url-cell" title={url.originalUrl}>
                                {url.originalUrl}
                              </div>
                            </td>
                            <td>
                              <button 
                                className="chip chip-primary"
                                onClick={() => handleRedirect(url.shortCode)}
                              >
                                {url.shortUrl}
                              </button>
                            </td>
                            <td>
                              <span className={`chip ${new Date() > new Date(url.expiryDate) ? 'chip-error' : 'chip-default'}`}>
                                <span className="material-icons">timer</span>
                                {getTimeRemaining(url.expiryDate)}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="btn-icon"
                                onClick={() => copyToClipboard(url.shortUrl)}
                                title="Copy to clipboard"
                              >
                                <span className="material-icons">content_copy</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 1 && (
          <div className="statistics-page">
            <div className="card">
              <div className="card-header">
                <h2>URL Statistics</h2>
                <p>Comprehensive analytics for all your shortened URLs.</p>
              </div>
              <div className="card-content">
                {shortenedUrls.length === 0 ? (
                  <div className="alert alert-info">
                    <span className="material-icons">info</span>
                    No shortened URLs found. Create some URLs first to see statistics.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Short URL</th>
                          <th>Original URL</th>
                          <th>Created</th>
                          <th>Expires</th>
                          <th>Status</th>
                          <th>Clicks</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shortenedUrls.map((url) => {
                          const isExpired = new Date() > new Date(url.expiryDate);
                          return (
                            <tr key={url.id}>
                              <td>
                                <button 
                                  className="chip chip-primary"
                                  onClick={() => !isExpired && handleRedirect(url.shortCode)}
                                  disabled={isExpired}
                                >
                                  /{url.shortCode}
                                </button>
                              </td>
                              <td>
                                <div className="url-cell" title={url.originalUrl}>
                                  {url.originalUrl}
                                </div>
                              </td>
                              <td>{formatDate(url.creationDate)}</td>
                              <td>{formatDate(url.expiryDate)}</td>
                              <td>
                                <span className={`chip ${isExpired ? 'chip-error' : 'chip-success'}`}>
                                  {isExpired ? 'Expired' : 'Active'}
                                </span>
                              </td>
                              <td>
                                <span className={`chip ${url.clicks > 0 ? 'chip-primary' : 'chip-default'}`}>
                                  <span className="material-icons">visibility</span>
                                  {url.clicks}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn-icon"
                                  onClick={() => copyToClipboard(url.shortUrl)}
                                  title="Copy short URL"
                                >
                                  <span className="material-icons">content_copy</span>
                                </button>
                                {url.clicks > 0 && (
                                  <button 
                                    className="btn-icon"
                                    onClick={() => setModalUrl(url)}
                                    title="View click details"
                                  >
                                    <span className="material-icons">analytics</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Alerts */}
      <div className="alerts-container">
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            message={alert.message}
            type={alert.type}
            onClose={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
          />
        ))}
      </div>

      {/* Click Details Modal */}
      <ClickDetailsModal
        isOpen={!!modalUrl}
        url={modalUrl}
        onClose={() => setModalUrl(null)}
      />
    </div>
  );
}

export default App;