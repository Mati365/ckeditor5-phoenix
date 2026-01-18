defmodule Playground.ImageUploadTest do
  use Playground.FeatureCase

  feature "Image Upload: uploads and inserts image", %{session: session} do
    image_path = Path.expand("../support/fixtures/pixel.png", __DIR__)
    image_data = File.read!(image_path) |> Base.encode64()

    session
    |> visit(~p"/image-upload")
    |> assert_has(Query.css(".ck-editor__editable"))
    |> then(fn session ->
      # Wait for initialization of the editor.
      Process.sleep(500)
      session
    end)
    |> Wallaby.Browser.execute_script("""
      const editable = document.querySelector('.ck-editor__editable');

      // Convert base64 to blob
      const byteString = atob('#{image_data}');
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/png' });
      const file = new File([blob], 'pixel.png', { type: 'image/png' });

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
      });

      editable.dispatchEvent(pasteEvent);
    """)
    |> assert_has(Query.css(".ck-content img[src*='/uploads/']", count: 1))
  end
end
