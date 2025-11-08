import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL');

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!SLACK_WEBHOOK_URL) {
    console.error('SLACK_WEBHOOK_URL is not set in environment variables.');
    return new Response('Internal Server Error: Webhook URL not configured.', { status: 500 });
  }

  try {
    const { event, user, details } = await req.json();

    if (!event || !user) {
      return new Response('Bad Request: Missing event or user data.', { status: 400 });
    }

    const message = {
      text: `*New User Action:* ${event}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*:bell: New User Action: *${event}*`,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*User:* ${user.email}` },
            { type: 'mrkdwn', text: `*Role:* ${user.role || 'N/A'}` },
            { type: 'mrkdwn', text: `*Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' })}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``,
          },
        },
      ],
    };

    const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!slackResponse.ok) {
      const errorBody = await slackResponse.text();
      console.error('Error sending message to Slack:', slackResponse.status, errorBody);
      return new Response('Failed to send message to Slack.', { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});
