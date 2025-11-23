export interface ParsedRequest {
  endpoint: string;
  httpMethod: string;
  requestBody?: string;
  headers?: string;
}

export function parsePostmanCollection(collection: any, envVars: Record<string,string> = {}): ParsedRequest[] {
  const requests: ParsedRequest[] = [];

  // Build collection-level variable map
  const collectionVars: Record<string, string> = {};
  const collVarKey = collection.variable || collection.variables;
  if (collVarKey && Array.isArray(collVarKey)) {
    collVarKey.forEach((v: any) => {
      if (v.key || v.name) collectionVars[v.key || v.name] = v.value || '';
    });
  }

  const replaceVariables = (input: string | undefined, vars: Record<string, string>) => {
    if (!input) return input;
    return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, varName) => {
      if (varName in envVars) return envVars[varName];
      if (varName in vars) return vars[varName];
      if (varName in collectionVars) return collectionVars[varName];
      return _match; // leave as-is if not found
    });
  };

  const processItem = (item: any, parentVars: Record<string, string> = {}) => {
    const currentVars = { ...parentVars };
    const itemVarKey = item.variable || item.variables;
    if (itemVarKey && Array.isArray(itemVarKey)) {
      itemVarKey.forEach((v: any) => {
        if (v.key || v.name) currentVars[v.key || v.name] = v.value || '';
      });
    }

    if (item.request) {
      const req = item.request;
      const requestVars = { ...currentVars };
      const reqVarKey = req.variable || req.variables;
      if (reqVarKey && Array.isArray(reqVarKey)) {
        reqVarKey.forEach((v: any) => {
          if (v.key || v.name) requestVars[v.key || v.name] = v.value || '';
        });
      }
      // Merge url variables (path variables) into request vars
      if (req.url && typeof req.url === 'object') {
        const urlVarsKey = req.url.variable || req.url.variables;
        if (urlVarsKey && Array.isArray(urlVarsKey)) {
          urlVarsKey.forEach((v: any) => {
            if (v.key || v.name) requestVars[v.key || v.name] = v.value || '';
          });
        }
      }

      let endpoint = '';
      let headers = '';
      let requestBody = '';

      // Parse URL
      if (typeof req.url === 'string') {
        endpoint = replaceVariables(req.url, requestVars) || '';
      } else if (req.url && req.url.raw) {
        endpoint = replaceVariables(req.url.raw, requestVars) || '';
      } else if (req.url && Array.isArray(req.url)) {
        endpoint = req.url.map((part: any) => typeof part === 'string' ? part : (part.value || '')).join('');
        endpoint = replaceVariables(endpoint, requestVars) || '';
      } else if (req.url && typeof req.url === 'object') {
        const urlObj = req.url;
        let urlStr = '';
        if (urlObj.protocol) urlStr += urlObj.protocol + '://';
        if (urlObj.host && Array.isArray(urlObj.host)) {
          urlStr += urlObj.host.map((p: any) => replaceVariables(p, requestVars) || p).join('.');
        }
        if (urlObj.port) urlStr += ':' + urlObj.port;
        if (urlObj.path && Array.isArray(urlObj.path)) {
          urlStr += '/' + urlObj.path.map((p: any) => replaceVariables(p, requestVars) || p).join('/');
        }
        if (urlObj.query && Array.isArray(urlObj.query)) {
          const queryStr = urlObj.query
            .filter((q: any) => q.key)
            .map((q: any) => `${encodeURIComponent(q.key)}=${encodeURIComponent(replaceVariables(q.value, requestVars) || q.value || '')}`)
            .join('&');
          if (queryStr) urlStr += '?' + queryStr;
        }
        endpoint = replaceVariables(urlStr, requestVars) || '';
      }

      // Parse headers
      if (req.header && Array.isArray(req.header)) {
        headers = req.header
          .filter((h: any) => h.key && h.value)
          .map((h: any) => `${h.key}: ${replaceVariables(h.value, requestVars) || h.value}`)
          .join('\n');
      }

      // Parse body
      if (req.body) {
        if (req.body.mode === 'raw' && req.body.raw) {
          requestBody = replaceVariables(req.body.raw, requestVars) || req.body.raw;
        } else if (req.body.mode === 'formdata' && req.body.formdata) {
          const formData = req.body.formdata
            .filter((f: any) => f.key)
            .map((f: any) => `${encodeURIComponent(f.key)}=${encodeURIComponent(replaceVariables(f.value, requestVars) || f.value || '')}`)
            .join('&');
          requestBody = formData;
          if (!headers.includes('Content-Type')) {
            headers += (headers ? '\n' : '') + 'Content-Type: application/x-www-form-urlencoded';
          }
        } else if (req.body.mode === 'urlencoded' && req.body.urlencoded) {
          const urlEncoded = req.body.urlencoded
            .filter((u: any) => u.key)
            .map((u: any) => `${encodeURIComponent(u.key)}=${encodeURIComponent(replaceVariables(u.value, requestVars) || u.value || '')}`)
            .join('&');
          requestBody = urlEncoded;
          if (!headers.includes('Content-Type')) {
            headers += (headers ? '\n' : '') + 'Content-Type: application/x-www-form-urlencoded';
          }
        }
      }

      if (endpoint) {
        requests.push({
          endpoint,
          httpMethod: req.method || 'GET',
          requestBody: requestBody || undefined,
          headers: headers || undefined
        });
      }
    } else if (item.item && Array.isArray(item.item)) {
      // This is a folder, process its children
      item.item.forEach((child: any) => processItem(child, currentVars));
    }
  };

  if (collection.item && Array.isArray(collection.item)) {
    collection.item.forEach((it: any) => processItem(it));
  }

  return requests;
}

export function parsePostmanEnvironment(env: any): Record<string, string> {
  const result: Record<string, string> = {};
  // Standard Postman env has 'values' array with { key, value, enabled }
  const values = env?.values || env?.values || env?.values || [];
  if (Array.isArray(values)) {
    values.forEach((v: any) => {
      if (v.key || v.name) {
        result[v.key || v.name] = v.value || '';
      }
    });
    return result;
  }
  // Some exports may store variables as object map
  const altVars = env?.variable || env?.variables || env?.vars || env?.values || {};
  if (typeof altVars === 'object' && !Array.isArray(altVars)) {
    Object.keys(altVars).forEach((k) => result[k] = String(altVars[k] ?? ''));
  }
  return result;
}
