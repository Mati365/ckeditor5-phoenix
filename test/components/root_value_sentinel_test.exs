defmodule CKEditor5.Components.RootValueSentinelTest do
  use ExUnit.Case, async: true

  import Phoenix.LiveViewTest

  alias CKEditor5.Components.RootValueSentinel

  test "renders root value sentinel with default settings" do
    html = render_component(&RootValueSentinel.render/1, editor_id: "editor-1", value: "Hello")

    assert html =~ ~s(phx-hook="CKRootValueSentinel")
    assert html =~ ~s(id="editor-1_main_sentinel")
    assert html =~ ~s(data-cke-editor-id="editor-1")
    assert html =~ ~s(data-cke-root-name="main")
    assert html =~ ~s(data-cke-value="Hello")
    assert html =~ ~s(data-cke-root-attrs="{}")
  end

  test "renders root value sentinel with custom root and root attributes" do
    html =
      render_component(&RootValueSentinel.render/1,
        editor_id: "editor-2",
        value: "World",
        root: "secondary",
        root_attrs: %{"data-lang" => "en", "data-foo" => "bar"}
      )

    assert html =~ ~s(id="editor-2_secondary_sentinel")
    assert html =~ ~s(data-cke-root-name="secondary")
    assert html =~ ~s(data-cke-value="World")

    # Ensure JSON is encoded and HTML-escaped in the attribute value
    assert html =~ ~s(&quot;data-lang&quot;:&quot;en&quot;)
    assert html =~ ~s(&quot;data-foo&quot;:&quot;bar&quot;)
  end
end
