defmodule CKEditor5.Components.UIPart do
  @moduledoc """
  Live View component for rendering a UI part of CKEditor 5, like a toolbar or a menubar.
  It may be used with decoupled editors.
  """

  use Phoenix.Component

  alias CKEditor5.Helpers

  attr :id, :string, required: false, doc: "The ID of the element."

  attr :name, :string,
    required: true,
    doc: """
    The name of the UI part. This will be used to identify the UI part
    in the editor configuration. E.g. "toolbar", "menubar".
    """

  attr :editor_id, :string,
    default: nil,
    doc: """
    The ID of the editor instance this UI part belongs to. If not provided,
    the first editor in the page will be used.
    """

  attr :rest, :global

  def render(assigns) do
    assigns =
      assigns |> Helpers.assign_id_if_missing("cke-ui-part-#{assigns.editor_id}-#{assigns.name}")

    ~H"""
    <div
      id={@id}
      phx-hook="CKUIPart"
      phx-update="ignore"
      data-cke-editor-id={@editor_id}
      data-cke-ui-part-name={@name}
      {@rest}
    >
    </div>
    """
  end
end
