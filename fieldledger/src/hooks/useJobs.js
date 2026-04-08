import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

export function useJobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchJobs = useCallback(async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setJobs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  async function createJob({ name, client, ohp }) {
    const { data, error } = await supabase
      .from('jobs')
      .insert({ name, client, ohp: parseFloat(ohp) || 28 })
      .select()
      .single()
    if (!error) setJobs(prev => [data, ...prev])
    return { data, error }
  }

  return { jobs, loading, createJob, refetch: fetchJobs }
}

export function useEntries(jobId) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchEntries = useCallback(async () => {
    if (!jobId) { setEntries([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('job_id', jobId)
      .order('date', { ascending: false })
    if (!error) setEntries(data || [])
    setLoading(false)
  }, [jobId])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function addEntry(entry) {
    const { data, error } = await supabase
      .from('entries')
      .insert(entry)
      .select()
      .single()
    if (!error) setEntries(prev => [data, ...prev])
    return { data, error }
  }

  async function deleteEntry(id) {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (!error) setEntries(prev => prev.filter(e => e.id !== id))
    return { error }
  }

  return { entries, loading, addEntry, deleteEntry, refetch: fetchEntries }
}

export function useAllEntries() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('entries')
        .select('*, jobs(name)')
        .order('date', { ascending: false })
      if (!error) setEntries(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  async function deleteEntry(id) {
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (!error) setEntries(prev => prev.filter(e => e.id !== id))
    return { error }
  }

  return { entries, loading, deleteEntry }
}

export function usePayments(jobId) {
  const [payments, setPayments] = useState([])

  const fetchPayments = useCallback(async () => {
    if (!jobId) { setPayments([]); return }
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
    if (!error) setPayments(data || [])
  }, [jobId])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  async function addPayment({ label, amount }) {
    const { data, error } = await supabase
      .from('payments')
      .insert({ job_id: jobId, label, amount: parseFloat(amount) || 0 })
      .select()
      .single()
    if (!error) setPayments(prev => [...prev, data])
    return { data, error }
  }

  async function updatePayment(id, updates) {
    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (!error) setPayments(prev => prev.map(p => p.id === id ? data : p))
    return { data, error }
  }

  async function deletePayment(id) {
    const { error } = await supabase.from('payments').delete().eq('id', id)
    if (!error) setPayments(prev => prev.filter(p => p.id !== id))
    return { error }
  }

  return { payments, addPayment, updatePayment, deletePayment }
}

export function useUsedCodes() {
  const [codes, setCodes] = useState([])

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('entries')
        .select('cost_code')
      if (!error && data) {
        const freq = {}
        data.forEach(e => { if (e.cost_code) freq[e.cost_code] = (freq[e.cost_code] || 0) + 1 })
        const sorted = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .map(e => e[0])
        setCodes(sorted)
      }
    }
    fetch()
  }, [])

  return codes
}
