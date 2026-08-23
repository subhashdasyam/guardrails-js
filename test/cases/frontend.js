// Paired cases for the Angular and Svelte pack.

export default [
  {
    rule: 'NG-BYPASS',
    file: 'src/app.component.ts',
    fire: `export class AppComponent {
      render(html: string) {
        return this.sanitizer.bypassSecurityTrustHtml(html);
      }
    }`,
    safe: [
      `export class AppComponent {
        render(html: string) {
          return this.sanitizer.bypassSecurityTrustHtml(DOMPurify.sanitize(html));
        }
      }`,
      `export class AppComponent {
        readonly logo = this.sanitizer.bypassSecurityTrustResourceUrl('https://cdn.example.com/logo.svg');
      }`,
    ],
  },

  {
    rule: 'NG-INNERHTML',
    file: 'src/comment.component.ts',
    fire: `@Component({
      selector: 'app-comment',
      template: '<div [innerHTML]="comment.body"></div>',
    })
    export class CommentComponent {}`,
    safe: [
      `@Component({
        selector: 'app-comment',
        template: '<div>{{ comment.body }}</div>',
      })
      export class CommentComponent {}`,
      `@Component({
        selector: 'app-comment',
        template: '<div [innerHTML]="sanitize(comment.body)"></div>',
      })
      export class CommentComponent {}`,
    ],
  },

  {
    rule: 'SVELTE-HTML',
    file: 'src/Comment.svelte',
    fire: `<script>
  export let comment;
</script>

<div class="comment">
  {@html comment.body}
</div>`,
    safe: [
      `<script>
  export let comment;
</script>

<div class="comment">
  {comment.body}
</div>`,
      `<script>
  import DOMPurify from 'dompurify';
  export let comment;
</script>

<div class="comment">
  {@html DOMPurify.sanitize(comment.body)}
</div>`,
    ],
  },

  {
    rule: 'SVELTE-URL',
    file: 'src/Item.svelte',
    fire: `<script>
  export let item;
</script>

<a href={item.url}>open</a>`,
    safe: [
      `<script>
  export let item;
  $: safe = /^https?:\\/\\//.test(item.url) ? item.url : '#';
</script>

<a href={safe}>open</a>`,
      `<script>
  export let item;
</script>

<a href="/dashboard">open</a>`,
    ],
  },
];
