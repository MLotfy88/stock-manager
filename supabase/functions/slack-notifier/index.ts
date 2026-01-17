import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  if (!SLACK_WEBHOOK_URL) {
    console.error('SLACK_WEBHOOK_URL is not set in environment variables.');
    return new Response('Internal Server Error: Webhook URL not configured.', { status: 500, headers: corsHeaders });
  }

  try {
    const { event, user, details } = await req.json();

    if (!event || !user) {
      return new Response('Bad Request: Missing event or user data.', { status: 400, headers: corsHeaders });
    }
    // ...
    if (!slackResponse.ok) {
      const errorBody = await slackResponse.text();
      console.error('Error sending message to Slack:', slackResponse.status, errorBody);
      return new Response('Failed to send message to Slack.', { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
  }
});
