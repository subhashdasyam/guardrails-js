<script>
  import DOMPurify from 'dompurify';

  export let comment;
  export let onReply;

  // A protocol check before anything is bound to href.
  $: safeHomepage = /^https?:\/\//.test(comment.author.homepage) ? comment.author.homepage : '#';

  // Markup only ever reaches the page through a sanitiser.
  $: safeBody = DOMPurify.sanitize(comment.bodyHtml);

  async function loadReplies() {
    const response = await fetch(new URL(`/comments/${comment.id}/replies`, API_BASE), {
      credentials: 'include',
      redirect: 'error',
    });
    if (!response.ok) throw new Error('failed to load replies');
    return response.json();
  }
</script>

<article class="comment">
  <a href={safeHomepage} target="_blank" rel="noopener noreferrer">
    {comment.author.name}
  </a>

  {@html safeBody}

  <ul>
    {#each comment.replies as reply (reply.id)}
      <li>{reply.body}</li>
    {/each}
  </ul>

  <button on:click={() => onReply(comment.id)}>reply</button>
</article>
