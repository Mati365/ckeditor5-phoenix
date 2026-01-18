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
    |> assert_image_uploaded()
  end

  defp assert_image_uploaded(session) do
    query = Query.css(".ck-content img[src*='/uploads/']", count: 1)

    result =
      Enum.reduce_while(1..20, false, fn _, _ ->
        if Wallaby.Browser.has?(session, query) do
          {:halt, true}
        else
          Process.sleep(500)
          {:cont, false}
        end
      end)

    if result do
      assert_has(session, query)
    else
      # Final check to raise the error if still not found
      assert_has(session, query)
    end
  end
end
