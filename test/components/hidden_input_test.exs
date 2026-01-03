defmodule CKEditor5.Components.HiddenInputTest do
  use ExUnit.Case, async: true

  import Phoenix.LiveViewTest

  alias CKEditor5.Components.HiddenInput

  test "renders hidden input with all attributes" do
    html =
      render_component(&HiddenInput.render/1,
        id: "input1",
        name: "hidden",
        value: "abc",
        required: true
      )

    refute html =~ ~s(type="hidden")
    assert html =~ ~s(id="input1")
    assert html =~ ~s(name="hidden")
    assert html =~ ~s(value="abc")
    assert html =~ ~s(required)
  end

  test "renders with default value and not required" do
    html = render_component(&HiddenInput.render/1, id: "input2", name: "hidden2")

    assert html =~ ~s(value="")
    refute html =~ ~s(required)
  end
end
