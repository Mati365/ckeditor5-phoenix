defmodule CKEditor5.Components.Editable do
  @moduledoc """
  Live View component for rendering an editable area in CKEditor 5.
  It may be used with decoupled editors or multiroot editors.
  """

  use Phoenix.Component

  import CKEditor5.Form

  alias CKEditor5.Helpers
  alias CKEditor5.Components.HiddenInput

  attr :id, :string,
    doc: """
    The ID of the component. If not provided, it will be generated from the
    `editor_id` and `name` attributes.
    """

  attr :root, :string,
    required: true,
    doc: """
    The name of the root that is associated with this editable area. Editor may contain multiple
    roots which correspond to separate documents (or sections) of the editor. This name will be used
    as a key to identify the editable area in the editor's data.
    """

  attr :editor_id, :string,
    default: nil,
    doc: """
    The ID of the editor instance this editable belongs to. If not provided,
    the first editor in the page will be used.
    """

  form_attrs()

  attr :rest, :global

  def render(assigns) do
    assigns =
      assigns
      |> Helpers.assign_id_if_missing("cke-editable")
      |> assign_form_fields()

    ~H"""
    <div
      id={@id}
      phx-hook="CKEditable"
      phx-update="ignore"
      data-cke-editor-id={@editor_id}
      data-cke-editable-root-name={@root}
      data-cke-editable-initial-value={@value}
      data-cke-editable-required={@required}
      {@rest}
    >
      <div data-cke-editable-content></div>
      <%= if @name do %>
        <HiddenInput.render
          id={"#{@id}_input"}
          name={@name}
          value={@value}
          required={@required}
        />
      <% end %>
    </div>
    """
  end
end
