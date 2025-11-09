'use client';

import { useState, useEffect } from 'react';
import { createExecutionPlan, getExecutionPlans, createTestRequest, ExecutionPlan, TestRequest, reorderTestRequests, moveTestRequest, deleteExecutionPlan, deleteTestRequest, updateExecutionPlan, updateTestRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FolderIcon from '@mui/icons-material/Folder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTestRequestProps {
  request: TestRequest;
  planId: string;
  getMethodColor: (method: string) => string;
  onEdit: (request: TestRequest) => void;
  onDelete: (requestId: string) => void;
  isExpanded: boolean;
  onToggleExpansion: (requestId: string) => void;
  baseUrl: string;
  queryParams: [string, string][];
  onClone: (request: TestRequest, planId: string) => void;
}

function DroppablePlan({ plan, planKey, children }: { plan: ExecutionPlan; planKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: planKey,
    data: { type: 'plan', plan },
  });

  const className = plan.testRequests.length === 0
    ? `bg-white border-2 border-dashed rounded-lg shadow-sm hover:shadow-md transition-all ${
        isOver ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200'
      }`
    : `bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
        isOver ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200'
      }`;

  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

function SortableTestRequest({ request, planId, getMethodColor, onEdit, onDelete, isExpanded, onToggleExpansion, baseUrl, queryParams, onClone }: SortableTestRequestProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `request_${request.id}_${planId}`,
    data: { type: 'request', request, planId },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`ml-8 mr-4 mb-4 mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors group cursor-pointer ${isDragging ? 'opacity-0' : 'opacity-100'}`} onClick={() => onToggleExpansion(request.id)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-200 rounded flex flex-col justify-center items-center" title="Drag to reorder" onClick={(e) => e.stopPropagation()}>
            <div className="w-4 h-0.5 bg-gray-400 mb-1"></div>
            <div className="w-4 h-0.5 bg-gray-400 mb-1"></div>
            <div className="w-4 h-0.5 bg-gray-400"></div>
          </div>
          <span className={`${getMethodColor(request.httpMethod)} text-white px-3 py-1 rounded font-bold text-sm w-16 text-center`}>
            {request.httpMethod}
          </span>
          <span className="text-md font-medium text-gray-800">{baseUrl}</span>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onToggleExpansion(request.id); }} className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded" title={isExpanded ? "Collapse" : "Expand"}>
            {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(request); }} className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded" title="Edit">
            <EditIcon fontSize="small" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClone(request, planId); }} className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded" title="Clone">
            <ContentCopyIcon fontSize="small" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(request.id); }} className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
            <DeleteIcon fontSize="small" />
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HTTP Method:</label>
            <span className={`${getMethodColor(request.httpMethod)} text-white px-3 py-1 rounded font-bold text-sm`}>{request.httpMethod}</span>
          </div>
          
          {queryParams.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Query Parameters:</label>
              <div className="bg-gray-100 p-3 rounded text-sm">
                {queryParams.map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="font-medium text-blue-600">{key}:</span>
                    <span className="text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {request.headers && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Headers:</label>
              <pre className="bg-gray-100 p-3 rounded text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">{request.headers}</pre>
            </div>
          )}
          
          {request.requestBody && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Body:</label>
              <pre className="bg-gray-100 p-3 rounded text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto">{request.requestBody}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExecutionPlansPage() {
  const { user, session } = useAuth();
  const [executionPlans, setExecutionPlans] = useState<ExecutionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [expandedPlans, setExpandedPlans] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<{ type: 'request'; request: TestRequest; planId: string } | null>(null);
  const [showPlanMenu, setShowPlanMenu] = useState<string | null>(null);
  const [renamingPlan, setRenamingPlan] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingRequest, setEditingRequest] = useState<TestRequest | null>(null);
  const [editEndpoint, setEditEndpoint] = useState('');
  const [editHttpMethod, setEditHttpMethod] = useState('GET');
  const [editRequestBody, setEditRequestBody] = useState('');
  const [editRequestHeaders, setEditRequestHeaders] = useState('');
  const [planName, setPlanName] = useState('');
  const [expandedRequests, setExpandedRequests] = useState<string[]>([]);
  const [creatingRequest, setCreatingRequest] = useState<{ planId: string } | null>(null);
  const [newEndpoint, setNewEndpoint] = useState('');
  const [newHttpMethod, setNewHttpMethod] = useState('GET');
  const [newRequestBody, setNewRequestBody] = useState('');
  const [newRequestHeaders, setNewRequestHeaders] = useState('');

  const parseEndpoint = (endpoint: string) => {
    try {
      const url = new URL(endpoint.startsWith('http') ? endpoint : `http://dummy.com${endpoint}`);
      const baseUrl = endpoint.startsWith('http') ? 
        `${url.protocol}//${url.host}${url.pathname}` : 
        url.pathname;
      const queryParams = Array.from(url.searchParams.entries());
      return { baseUrl, queryParams };
    } catch {
      // If URL parsing fails, return the original endpoint as baseUrl
      return { baseUrl: endpoint, queryParams: [] };
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isValidPlanName = () => planName.trim().length > 0;

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-500', POST: 'bg-blue-500', PUT: 'bg-orange-500',
      PATCH: 'bg-yellow-500', DELETE: 'bg-red-500', OPTIONS: 'bg-purple-500'
    };
    return colors[method] || 'bg-gray-500';
  };

  useEffect(() => {
    if (session?.user?.email) {
      listExecutionPlans();
    }
  }, [session]);

  const listExecutionPlans = async () => {
    try {
      setLoading(true);
      const plans = await getExecutionPlans();
      setExecutionPlans(plans.executionPlans);
    } catch (error) {
      alert('Error loading execution plans: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveExecutionPlan = async () => {
    if (!isValidPlanName()) return;
    try {
      await createExecutionPlan({ name: planName.trim() });
      setPlanName('');
      await listExecutionPlans();
      setShowForm(false);
    } catch (error) {
      alert('Error creating execution plan: ' + (error as Error).message);
    }
  };

  const handleDeleteExecutionPlan = async (planId: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await deleteExecutionPlan(planId);
      await listExecutionPlans();
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  };

  const handleRenameExecutionPlan = async (planId: string) => {
    if (!renameValue.trim()) { alert('Name cannot be empty'); return; }
    try {
      await updateExecutionPlan(planId, { name: renameValue.trim() });
      await listExecutionPlans();
      setRenamingPlan(null);
      setRenameValue('');
      setShowPlanMenu(null);
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  };

  const handleDeleteTestRequest = async (planId: string, requestId: string) => {
    if (!confirm('Delete this request?')) return;
    
    // Optimistic update: remove from local state immediately
    const originalPlans = [...executionPlans];
    setExecutionPlans(prev => prev.map(plan => 
      plan.id === planId 
        ? { ...plan, testRequests: plan.testRequests.filter(r => r.id !== requestId) }
        : plan
    ));
    
    try {
      await deleteTestRequest(planId, requestId);
    } catch (error) {
      // Revert on error
      setExecutionPlans(originalPlans);
      alert('Error: ' + (error as Error).message);
    }
  };

  const handleEditTestRequest = (request: TestRequest) => {
    setEditingRequest(request);
    setEditEndpoint(request.endpoint);
    setEditHttpMethod(request.httpMethod);
    setEditRequestBody(request.requestBody || '');
    setEditRequestHeaders(request.headers || '');
  };

  const handleCreateNewRequest = (planId: string) => {
    setCreatingRequest({ planId });
    setNewEndpoint('');
    setNewHttpMethod('GET');
    setNewRequestBody('');
    setNewRequestHeaders('');
  };

  const handleSaveNewTestRequest = async () => {
    if (!creatingRequest) return;
    
    // Create temporary request with a temporary ID
    const tempId = `temp-${Date.now()}`;
    const tempRequest: TestRequest = {
      id: tempId,
      endpoint: newEndpoint,
      httpMethod: newHttpMethod,
      requestBody: newRequestBody || undefined,
      headers: newRequestHeaders || undefined,
      createdAt: new Date().toISOString(),
      createdBy: undefined,
    };
    
    // Optimistic update: add to local state immediately
    setExecutionPlans(prev => prev.map(plan => 
      plan.id === creatingRequest.planId 
        ? { ...plan, testRequests: [...plan.testRequests, tempRequest] }
        : plan
    ));
    
    setCreatingRequest(null);
    setNewEndpoint('');
    setNewHttpMethod('GET');
    setNewRequestBody('');
    setNewRequestHeaders('');
    
    try {
      const newRequest = await createTestRequest({
        executionPlanId: creatingRequest.planId,
        endpoint: newEndpoint,
        httpMethod: newHttpMethod,
        requestBody: newRequestBody || undefined,
        headers: newRequestHeaders || undefined,
      });
      
      // Replace temporary request with real one
      setExecutionPlans(prev => prev.map(plan => 
        plan.id === creatingRequest.planId 
          ? { ...plan, testRequests: plan.testRequests.map(r => r.id === tempId ? newRequest : r) }
          : plan
      ));
    } catch (error) {
      // Remove temporary request on error
      setExecutionPlans(prev => prev.map(plan => 
        plan.id === creatingRequest.planId 
          ? { ...plan, testRequests: plan.testRequests.filter(r => r.id !== tempId) }
          : plan
      ));
      alert('Error: ' + (error as Error).message);
    }
  };

  const handleCloneTestRequest = async (request: TestRequest, planId: string) => {
    const plan = executionPlans.find(p => p.id === planId);
    if (!plan) return;
    
    // Find the index of the original request
    const originalIndex = plan.testRequests.findIndex(r => r.id === request.id);
    if (originalIndex === -1) return;
    
    // Create temporary request with a temporary ID
    const tempId = `temp-${Date.now()}`;
    const clonedRequest: TestRequest = {
      ...request,
      id: tempId,
      createdAt: new Date().toISOString(),
      createdBy: undefined, // Will be set by the server
    };
    
    // Optimistic update: insert cloned request just below the original
    setExecutionPlans(prev => prev.map(p => 
      p.id === planId 
        ? { 
            ...p, 
            testRequests: [
              ...p.testRequests.slice(0, originalIndex + 1),
              clonedRequest,
              ...p.testRequests.slice(originalIndex + 1)
            ]
          }
        : p
    ));
    
    try {
      const newRequest = await createTestRequest({
        executionPlanId: planId,
        endpoint: request.endpoint,
        httpMethod: request.httpMethod,
        requestBody: request.requestBody || undefined,
        headers: request.headers || undefined,
      });
      
      // Get the current request order and insert the new request at the correct position
      const currentRequests = executionPlans.find(p => p.id === planId)?.testRequests || [];
      const reorderedIds = currentRequests
        .filter(r => r.id !== tempId) // Remove temp request
        .map(r => r.id === tempId ? newRequest.id : r.id); // Replace temp ID with real ID
      
      // Insert the new request ID at the position right after the original
      const originalRequestIndex = reorderedIds.findIndex(id => id === request.id);
      reorderedIds.splice(originalRequestIndex + 1, 0, newRequest.id);
      
      // Reorder the requests in the backend
      await reorderTestRequests(planId, { requestIds: reorderedIds });
      
      // Update local state with the correctly ordered requests
      setExecutionPlans(prev => prev.map(p => 
        p.id === planId 
          ? { 
              ...p, 
              testRequests: p.testRequests.map(r => r.id === tempId ? newRequest : r)
            }
          : p
      ));
    } catch (error) {
      // Remove temporary request on error
      setExecutionPlans(prev => prev.map(p => 
        p.id === planId 
          ? { ...p, testRequests: p.testRequests.filter(r => r.id !== tempId) }
          : p
      ));
      alert('Error cloning request: ' + (error as Error).message);
    }
  };

  const handleSaveEditTestRequest = async () => {
    if (!editingRequest) return;
    const plan = executionPlans.find(p => p.testRequests.some(r => r.id === editingRequest.id));
    if (!plan) { alert('Could not find plan'); return; }
    
    // Optimistic update: update local state immediately
    const originalPlans = [...executionPlans];
    const updatedRequest = {
      ...editingRequest,
      endpoint: editEndpoint,
      httpMethod: editHttpMethod,
      requestBody: editRequestBody || undefined,
      headers: editRequestHeaders || undefined,
    };
    
    setExecutionPlans(prev => prev.map(p => 
      p.id === plan.id 
        ? { ...p, testRequests: p.testRequests.map(r => r.id === editingRequest.id ? updatedRequest : r) }
        : p
    ));
    
    setEditingRequest(null);
    
    try {
      await updateTestRequest(plan.id, editingRequest.id, {
        endpoint: editEndpoint || undefined,
        httpMethod: editHttpMethod || undefined,
        requestBody: editRequestBody || undefined,
        headers: editRequestHeaders || undefined,
      });
    } catch (error) {
      // Revert on error
      setExecutionPlans(originalPlans);
      alert('Error: ' + (error as Error).message);
    }
  };

  const togglePlan = (key: string) => {
    setExpandedPlans(prev => prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]);
  };

  const toggleRequestExpansion = (requestId: string) => {
    setExpandedRequests(prev => prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const data = event.active.data.current;
    if (data?.type === 'request') {
      setActiveItem({ type: 'request', request: data.request, planId: data.planId });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {};

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) { setActiveId(null); setActiveItem(null); return; }

    const activeId_str = String(active.id);
    const overId_str = String(over.id);
    const activeParts = activeId_str.split('_');
    const overParts = overId_str.split('_');

    if (activeParts[0] === 'request' && overParts[0] === 'request') {
      const requestId = activeParts[1];
      const planId = activeParts[2];
      const overRequestId = overParts[1];
      const plan = executionPlans.find(p => p.id === planId);
      if (!plan) return;
      
      const oldIndex = plan.testRequests.findIndex(r => r.id === requestId);
      const newIndex = plan.testRequests.findIndex(r => r.id === overRequestId);
      if (oldIndex === newIndex) { setActiveId(null); setActiveItem(null); return; }

      const newOrder = arrayMove(plan.testRequests, oldIndex, newIndex);
      setExecutionPlans(prev => prev.map(p => p.id === planId ? { ...p, testRequests: newOrder } : p));

      try {
        await reorderTestRequests(planId, { requestIds: newOrder.map(r => r.id) });
      } catch (error) {
        await listExecutionPlans();
        alert('Error: ' + (error as Error).message);
      }
    } else if (activeParts[0] === 'request' && overParts[0] === 'plan') {
      const requestId = activeParts[1];
      const fromPlanId = activeParts[2];
      const toPlanId = overParts[1];

      if (fromPlanId !== toPlanId) {
        try {
          const requestToMove = executionPlans.find(p => p.id === fromPlanId)?.testRequests.find(r => r.id === requestId);
          if (requestToMove) {
            setExecutionPlans(prev => prev.map(plan => {
              if (plan.id === fromPlanId) {
                return { ...plan, testRequests: plan.testRequests.filter(r => r.id !== requestId) };
              } else if (plan.id === toPlanId) {
                return { ...plan, testRequests: [...plan.testRequests, requestToMove] };
              }
              return plan;
            }));
          }
          await moveTestRequest(fromPlanId, requestId, { newExecutionPlanId: toPlanId });
        } catch (error) {
          await listExecutionPlans();
          alert('Error: ' + (error as Error).message);
        }
      }
    }

    setActiveId(null);
    setActiveItem(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">Execution Plans</h1>

        <div className="text-center mb-6">
          <button onClick={() => {
            if (session?.access_token) {
              navigator.clipboard.writeText(session.access_token);
              alert('JWT Token copied!');
            }
          }} className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
            Copy JWT Token for Postman
          </button>
        </div>

        {loading && <div className="text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}

        {!loading && executionPlans.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="space-y-4 mb-6">
              {executionPlans.map((plan) => {
                const planKey = `plan_${plan.id}`;
                return (
                  <DroppablePlan key={planKey} plan={plan} planKey={planKey}>
                    <div className="flex justify-between items-center p-4">
                      <div onClick={() => togglePlan(planKey)} className="flex items-center gap-4 cursor-pointer flex-1">
                        <FolderIcon className="text-2xl text-blue-600" />
                        {renamingPlan === plan.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              autoFocus
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
                            />
                            <button onClick={(e) => { e.stopPropagation(); handleRenameExecutionPlan(plan.id); }} className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">Save</button>
                            <button onClick={(e) => { e.stopPropagation(); setRenamingPlan(null); setRenameValue(''); }} className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <span className="text-lg font-medium text-gray-800">{plan.name}</span>
                            <span className="text-sm text-gray-500">({plan.testRequests.length} requests)</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleCreateNewRequest(plan.id); }} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                          New Request
                        </button>
                        <ChevronRightIcon className={`transform transition-transform cursor-pointer text-gray-600 hover:text-gray-800 ${expandedPlans.includes(planKey) ? 'rotate-90' : ''}`} onClick={() => togglePlan(planKey)} />
                        <div className="relative">
                          <button onClick={(e) => { e.stopPropagation(); setShowPlanMenu(showPlanMenu === plan.id ? null : plan.id); }} className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">
                            <MoreVertIcon />
                          </button>
                          {showPlanMenu === plan.id && (
                            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                              <button onClick={(e) => { e.stopPropagation(); setRenamingPlan(plan.id); setRenameValue(plan.name); setShowPlanMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                <EditIcon fontSize="small" />
                                Rename
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteExecutionPlan(plan.id); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <DeleteIcon fontSize="small" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedPlans.includes(planKey) && (
                      <div className="border-t border-gray-100">
                        <SortableContext items={plan.testRequests.map(req => `request_${req.id}_${plan.id}`)} strategy={verticalListSortingStrategy}>
                          {plan.testRequests.map((req) => {
                            const reqKey = `${plan.id}-${req.id}`;
                            const { baseUrl, queryParams } = parseEndpoint(req.endpoint);
                            const truncatedBaseUrl = truncateText(baseUrl);
                            const truncatedQueryParams = queryParams.map(([key, value]) => [key, truncateText(value)] as [string, string]);
                            return (
                              <SortableTestRequest
                                key={reqKey}
                                request={req}
                                planId={plan.id}
                                getMethodColor={getMethodColor}
                                onEdit={handleEditTestRequest}
                                onDelete={(requestId) => handleDeleteTestRequest(plan.id, requestId)}
                                isExpanded={expandedRequests.includes(req.id)}
                                onToggleExpansion={toggleRequestExpansion}
                                baseUrl={truncatedBaseUrl}
                                queryParams={truncatedQueryParams}
                                onClone={handleCloneTestRequest}
                              />
                            );
                          })}
                        </SortableContext>
                      </div>
                    )}
                  </DroppablePlan>
                );
              })}
            </div>
            <DragOverlay>
              {activeItem && activeItem.type === 'request' && (
                <div className="ml-8 mr-4 mb-4 mt-4 bg-white border border-gray-300 rounded-lg p-4 shadow-md">
                  <div className="flex items-center gap-4">
                    <span className={`${getMethodColor(activeItem.request.httpMethod)} text-white px-3 py-1 rounded font-bold text-sm w-16 text-center`}>
                      {activeItem.request.httpMethod}
                    </span>
                    <span className="text-md font-medium text-gray-800">{(() => {
                      const { baseUrl } = parseEndpoint(activeItem.request.endpoint);
                      return truncateText(baseUrl);
                    })()}</span>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {!loading && executionPlans.length === 0 && (
          <div className="text-center text-gray-600 mb-6">Start creating an Execution plan...</div>
        )}

        {editingRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Edit Test Request</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Endpoint:</label>
                  <input
                    type="text"
                    value={editEndpoint}
                    onChange={(e) => setEditEndpoint(e.target.value)}
                    placeholder="https://api.example.com/health"
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">HTTP Method:</label>
                  <select value={editHttpMethod} onChange={(e) => setEditHttpMethod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Request Body:</label>
                  <textarea
                    value={editRequestBody}
                    onChange={(e) => setEditRequestBody(e.target.value)}
                    placeholder="Request body (JSON, XML, etc.)"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Headers:</label>
                  <textarea
                    value={editRequestHeaders}
                    onChange={(e) => setEditRequestHeaders(e.target.value)}
                    placeholder="Headers (one per line, e.g. Content-Type: application/json)"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 font-mono text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={handleSaveEditTestRequest} className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save Changes</button>
                  <button onClick={() => setEditingRequest(null)} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {creatingRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Test Request</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Endpoint:</label>
                  <input
                    type="text"
                    value={newEndpoint}
                    onChange={(e) => setNewEndpoint(e.target.value)}
                    placeholder="https://api.example.com/health"
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">HTTP Method:</label>
                  <select value={newHttpMethod} onChange={(e) => setNewHttpMethod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Request Body:</label>
                  <textarea
                    value={newRequestBody}
                    onChange={(e) => setNewRequestBody(e.target.value)}
                    placeholder="Request body (JSON, XML, etc.)"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Headers:</label>
                  <textarea
                    value={newRequestHeaders}
                    onChange={(e) => setNewRequestHeaders(e.target.value)}
                    placeholder="Headers (one per line, e.g. Content-Type: application/json)"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-gray-900 font-mono text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={handleSaveNewTestRequest} className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600">Create Request</button>
                  <button onClick={() => setCreatingRequest(null)} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Create Execution Plan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Execution Plan Name:</label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="My API Tests"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={saveExecutionPlan} disabled={!isValidPlanName()} className={`px-6 py-2 rounded-lg transition ${isValidPlanName() ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                  Create Plan
                </button>
                {executionPlans.length > 0 && (
                  <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Cancel</button>
                )}
              </div>
            </div>
          </div>
        )}

        {!showForm && executionPlans.length > 0 && (
          <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600">
            Create New Execution Plan
          </button>
        )}
      </div>
    </div>
  );
}
