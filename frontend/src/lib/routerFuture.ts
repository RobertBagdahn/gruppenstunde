/**
 * React Router v7 future flags, shared by the app router and test routers.
 * v7_startTransition stays off: several search inputs are controlled directly
 * by URL params and would lag when URL updates run in a transition.
 */
export const ROUTER_FUTURE_FLAGS = { v7_startTransition: false, v7_relativeSplatPath: true } as const;
