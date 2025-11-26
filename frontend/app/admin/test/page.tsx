'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PermissionGuard } from '@/components/admin/PermissionGuard'
import { 
  TestTube, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Zap,
  Database,
  Server,
  Globe
} from 'lucide-react'

export default function TestPage() {
  return (
    <PermissionGuard permission="test.run">
      <TestPageContent />
    </PermissionGuard>
  )
}

function TestPageContent() {
  const [testResults, setTestResults] = useState<any[]>([])
  const [running, setRunning] = useState(false)

  const tests = [
    {
      id: 1,
      name: 'Authentication Flow',
      description: 'Test JWT token validation and refresh',
      icon: Globe,
      color: 'text-blue-600'
    },
    {
      id: 2,
      name: 'Database Connection',
      description: 'Verify Supabase connectivity',
      icon: Database,
      color: 'text-green-600'
    },
    {
      id: 3,
      name: 'API Endpoints',
      description: 'Test all admin API routes',
      icon: Server,
      color: 'text-purple-600'
    },
    {
      id: 4,
      name: 'Permission System',
      description: 'Validate RBAC implementation',
      icon: Zap,
      color: 'text-amber-600'
    }
  ]

  const runTests = async () => {
    setRunning(true)
    setTestResults([])
    
    for (const test of tests) {
      // Simulate test running
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Random pass/fail for demo
      const passed = Math.random() > 0.2
      setTestResults(prev => [...prev, {
        id: test.id,
        name: test.name,
        passed,
        duration: Math.floor(Math.random() * 500) + 100,
        message: passed ? 'All checks passed' : 'Test failed: Connection timeout'
      }])
    }
    
    setRunning(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8 text-[#1E4DD8]" />
            Test Suite
          </h1>
          <p className="text-muted-foreground mt-2">
            Run comprehensive tests to verify system functionality
          </p>
        </div>
        <Button 
          onClick={runTests} 
          disabled={running}
          size="lg"
          className="bg-[#1E4DD8] hover:bg-[#1E4DD8]/90"
        >
          {running ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <TestTube className="mr-2 h-4 w-4" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      {/* Test Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {tests.map((test) => {
          const Icon = test.icon
          const result = testResults.find(r => r.id === test.id)
          const isRunning = running && !result
          
          return (
            <Card key={test.id} className="relative overflow-hidden">
              {isRunning && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1E4DD8] to-[#29C6D1] animate-pulse" />
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gray-100`}>
                      <Icon className={`h-6 w-6 ${test.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{test.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {test.description}
                      </CardDescription>
                    </div>
                  </div>
                  {result && (
                    <Badge 
                      variant={result.passed ? 'default' : 'destructive'}
                      className="flex items-center gap-1"
                    >
                      {result.passed ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          Passed
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          Failed
                        </>
                      )}
                    </Badge>
                  )}
                  {isRunning && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3 animate-spin" />
                      Running
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {result && (
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={result.passed ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {result.message}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-mono">{result.duration}ms</span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      {testResults.length > 0 && testResults.length === tests.length && (
        <Card className="border-2 border-[#1E4DD8]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#1E4DD8]" />
              Test Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#1E4DD8]">
                  {testResults.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {testResults.filter(r => r.passed).length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {testResults.filter(r => !r.passed).length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Success Rate:</span>
                <span className="text-lg font-bold text-[#1E4DD8]">
                  {Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>About This Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This is a demo test page to showcase the permission system. In a real application, 
            you would implement actual test cases here.
          </p>
          <p>
            <strong>Permission Required:</strong> <code className="text-xs bg-gray-100 px-2 py-1 rounded">test.run</code>
          </p>
          <p>
            Only users with the "test.run" permission can access this page. Try creating the permission 
            and assigning it to different roles to test the RBAC system!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
